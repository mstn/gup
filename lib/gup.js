var unzip = require('unzip2');
var fs = require('fs');
var tmp = require('tmp');
var async = require('async');
var csv = require('csv');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var _ = require('lodash');

var GTFSFiles = require('./gtfs/meta');
var normalize = require('./gtfs/normalize');

var Gup = function(options){
  this.options = options;
};

Gup.prototype.setStartDate = function(rev, start, cb){
  var tag = this.options.tag;
  MongoClient.connect(this.options.url, function (err, db) {
    db.collection( 'gtfs_master', function (e, masterCollection) {
      masterCollection.update(
        {tag:tag, rev:parseInt(rev)},
        { $set:{
            start:start
          },
          $currentDate: {
            lastModified: true
          }
      }, function(e){
        db.close();
        cb(e);
      });
    });
  });
};

Gup.prototype.setEndDate = function(rev, end, cb){
  var tag = this.options.tag;
  MongoClient.connect(this.options.url, function (err, db) {
    db.collection( 'gtfs_master', function (e, masterCollection) {
      masterCollection.update(
        {tag:tag, rev:parseInt(rev)},
        { $set:{
            end:end
          },
          $currentDate: {
            lastModified: true
          }
      }, function(e){
        db.close();
        cb(e);
      });
    });
  });
};

Gup.prototype.setStatus = function(rev, status, cb){
  var tag = this.options.tag;
  MongoClient.connect(this.options.url, function (err, db) {
    db.collection( 'gtfs_master', function (e, masterCollection) {
      masterCollection.update(
        {tag:tag, rev:parseInt(rev)},
        { $set:{
            status:status
          },
          $currentDate: {
            lastModified: true
          }
      }, function(e){
        db.close();
        cb(e);
      });
    });
  });
};

Gup.prototype.getRevisions = function(cb){
  var tag = this.options.tag;
  MongoClient.connect(this.options.url, function (err, db) {
    db.collection( 'gtfs_master', {sort:[['lastModified', 1]]}, function (e, masterCollection) {
      masterCollection.find({tag:tag},function(e, cursor){
        if(e){
          return cb(e);
        }
        cursor.toArray(function(err, items) {
          cb(null, items);
          db.close();
        });
      });
    });
  });
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

        gtfsData[GTFSFile.fileNameBase] = [];

        var input = fs.createReadStream(filepath);
        var parser = csv.parse({
          columns: true,
          relax: true
        });
        parser.on('readable', function () {
          var line;

          while(line = parser.read()) {
            gtfsData[GTFSFile.fileNameBase].push(normalize(line));
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
                  date: new Date,
                  lastModified: new Date
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
