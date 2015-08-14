#!/usr/bin/env node

var program = require('commander');
var moment = require('moment');

var Gup = require('../lib/gup.js');
var gup;

program
  .version('0.0.1')
  .usage('[options] [gtfs zipped file]')
  .description('upload a dataset to mongodb')
  .option('-t, --tag [value]', 'tag the gtfs dataset')
  .option('-z, --zones [value]', 'use a zone tag')
  .option('-s, --start [value]', 'use a start date')
  .option('-e, --end [value]', 'use a end date')
  .option('-u, --url [value]', 'use a MongoDB url', 'http://localhost:27017/')
  .option('-d, --db [value]', 'use a MongoDB database', 'test');

program
  .action(function(filepath){
    gup = new Gup({
      url: program.url + '/' + program.db,
      tag: program.tag,
      zones: program.zones,
      start:moment(program.start).toDate(),
      end:moment(program.end).toDate()
    });
    gup.load(filepath, function(e){
      if (e){
        console.log(e);
        process.exit(1);
      }
    });
  });

program.parse(process.argv);
