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

module.exports = GTFSFiles;
