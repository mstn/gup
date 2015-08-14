var unzip = require('unzip2');
var fs = require('fs');
var tmp = require('tmp');
var async = require('async');
var csv = require('csv');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var _ = require('lodash');

var GTFSFiles = [
  {
    fileNameBase: 'agency',
    collection: 'agencies'
  }, {
    fileNameBase: 'calendar_dates',
    collection: 'calendardates'
  }, {
    fileNameBase: 'calendar',
    collection: 'calendars'
  }, {
    fileNameBase: 'fare_attributes',
    collection: 'fareattributes',
    optional:true
  }, {
    fileNameBase: 'fare_rules',
    collection: 'farerules',
    optional:true
  }, {
    fileNameBase: 'feed_info',
    collection: 'feedinfos',
    optional:true
  }, {
    fileNameBase: 'frequencies',
    collection: 'frequencies',
    optional:true
  }, {
    fileNameBase: 'routes',
    collection: 'routes'
  }, {
    fileNameBase: 'shapes',
    collection: 'shapes',
    optional:true
  }, {
    fileNameBase: 'stop_times',
    collection: 'stoptimes'
  }, {
    fileNameBase: 'stops',
    collection: 'stops'
  }, {
    fileNameBase: 'transfers',
    collection: 'transfers',
    optional:true
  }, {
    fileNameBase: 'trips',
    collection: 'trips'
  }
];

var removeNullValues = function(obj){
  var key;
  for(key in obj) {
    if(obj[key] === null) {
      delete obj[key];
    }
  }
}

var parseIntValues = function(obj){
  var key;
  for(key in obj) {
    if(_.contains([
          'stop_sequence',
          'direction_id',
          'shape_pt_sequence'], key)) {
      obj[key] = parseInt(obj[key]);
    }
  }
};

var parseCoordinates = function(obj){
  if(obj.stop_lat && obj.stop_lon) {
    obj.location = {
      type:'Point',
      coordinates:[
        parseFloat(obj.stop_lon),
        parseFloat(obj.stop_lat)
      ]
    };
  }
}

var Gup = function(options){
  this.options = options;
};

Gup.prototype.load = function(filepath, cb){

  var tag = this.options.tag;
  var start = this.options.start;
  var end = this.options.end;

  MongoClient.connect(this.options.url, function (err, db) {

    // load state vars
    var gtfsDir;
    var gtfsData = {};

    if (err){
      return cb(err);
    }

    async.series([
      preProcess,
      unzipDir,
      readFiles,
      validateGtfs,
      importGtfs,
      cleanupFiles
    ], function (e, results) {
      cb(e, results);
    });


    // tasks

    function preProcess(cb){
      gtfsDir = tmp.dirSync({
        unsafeCleanup:true
      });
      cb();
    }

    function unzipDir(cb){
      fs.createReadStream(filepath)
        .pipe(
          unzip.Extract({
              path: gtfsDir.name
          }).on('close', function(){
            cb();
          })
        ).on('error', function (e) {
          cb(e);
        });
    }

    function readFiles(cb){

      async.forEachSeries( GTFSFiles, function(GTFSFile, cb){

        var filepath = path.join(gtfsDir.name, GTFSFile.fileNameBase + '.txt');

        if( !fs.existsSync(filepath)) {
          if (!GTFSFile.optional){
            return cb('File not found ' + GTFSFile.fileNameBase);
          }
          return cb();
        }

        var input = fs.createReadStream(filepath);
        var parser = csv.parse({
          columns: true,
          relax: true
        });
        parser.on('readable', function () {
          gtfsData[GTFSFile.fileNameBase] = [];
          while(line = parser.read()) {
            _.each([
              removeNullValues,
              parseIntValues,
              parseCoordinates
            ], function(operation){
              operation(line);
            });
            gtfsData[GTFSFile.fileNameBase].push(line);
          }
        });
        parser.on('end', function (count) {
          cb();
        });
        parser.on('error', function(e){
          cb(e)
        });
        input.pipe(parser);


      }, function (e) {
        cb(e);
      });
    }

    function validateGtfs(cb){
      // TODO
      cb();
    }

    function importGtfs(cb){
      var master = 'gtfs_master';
      var counter = 'rev_counter';

      var entry;

      async.series([
        createNewEntryInMaster,
        importData,
        updateMaster
      ], function (e, results) {
        cb(e, results);
      });

      function createNewEntryInMaster(cb){
        db.collection( counter, function (e, counterCollection) {
          counterCollection.findAndModify(
            { tag: tag }, [ ['rev', 1] ], { $inc:{rev:1} }, {new:true, upsert:true},
            function(err, result){
              if (err){
                return cb(err);
              }
              entry = result.value;
              db.collection( master, function (e, masterCollection) {
                masterCollection.insert({
                  tag:entry.tag,
                  rev:entry.rev,
                  status:'PENDING',
                  start:start,
                  end:end,
                  date: new Date
                }, cb);
              });
            }
          )
        }, cb);
      }

      function importData(cb){
        async.forEachSeries( _.keys(gtfsData), function(type, cb){
          var data = gtfsData[type];
          db.collection(type, function (e, collection) {
            if (e) return cb(e);
            async.forEachSeries(data, function(item, cb){
              item.rev = entry.rev;
              item.tag = entry.tag;
              collection.insert(item, cb);
            }, cb);
          });
        }, cb);
      }

      function updateMaster(cb){
        db.collection( master, function (e, masterCollection) {
          masterCollection.update(
            {tag:entry.tag, rev:entry.rev},
            { $set:{
              status:'OK'
            }}, cb);
        });
      }


    }

    function cleanupFiles(cb){
      gtfsDir.removeCallback();
      db.close()
      cb();
    }

  });



};

module.exports = Gup;
