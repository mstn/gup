var fs = require('fs');
var csv = require('csv');

var normalize = require('../gtfs/normalize');

var Parser = function(){

};

Parser.prototype.parse = function(filepath, cb){

  var data = [];

  if( !fs.existsSync(filepath)) {
    return cb('file-not-found');
  }

  var input = fs.createReadStream(filepath);
  var parser = csv.parse({
    columns: true,
    relax: true
  });
  parser.on('readable', function () {
    var line;
    while(line = parser.read()) {
      data.push(normalize(line));
    }
  });
  parser.on('end', function(){
    cb(undefined, data);
  });
  parser.on('error', cb);
  input.pipe(parser);
};

module.exports = Parser;
