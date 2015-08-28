var _ = require('lodash');


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
};

var lowerCaseKeys = function(obj){
  var key, newKey;
  for(key in obj) {
    newKey = key.toLowerCase().trim();
    obj[ newKey ] = obj[key];
    if (newKey !== key){
      delete obj[key];
    }
  }
};

module.exports = function(obj){
  _.each([
    lowerCaseKeys,
    removeNullValues,
    parseIntValues,
    parseCoordinates
  ], function(operation){
    operation(obj);
  });
  return obj;
};
