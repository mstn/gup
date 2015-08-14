#!/usr/bin/env node

var program = require('commander');

program
  .version('0.0.1')
  .usage('[options] [gtfs zipped file]')
  .description('upload a dataset to mongodb')
  .option('-t, --tag [value]', 'tag the gtfs dataset')
  .option('-z, --zones [value]', 'use a zone tag')
  .option('-u, --url [value]', 'use a MongoDB url', 'http://localhost:27017/')
  .option('-d, --db [value]', 'use a MongoDB database', 'test');

program
  .action(function(filepath){
    console.log(filepath)
  });

program.parse(process.argv);
