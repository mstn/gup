# gup
uploader and manager for gtfs datasets

> WIP. This project is in a very early stage. API can change without notice and BUGS haunt the code.

What it does:

* upload gtfs zip files to MongoDB;
* handle different versions of the same datasets;
* datasets are tagged with a name.

What it doesn't:

* query gtfs datasets;
* define spatial or non spatial indexes on ids;
* define abstract models on the top to gtfs entities.

The last points are supposed to be handled at the application level.

## Aim

This package addresses the following problems

* datasets from different sources may have the same ids; so a sort of namespace for each dataset is needed;
* datasets can change (e.g. suppressed stops, minor fare changes);
* shit happens and in this case we want to be able to come back to an old safe state as soon as possible;
* clients could be interested in different versions of the same dataset (e.g. development and production environments).

The approach we followed is to upload every version of each dataset to MongoDB where data are marked with a tag and a revision number associated to a single upload.

In the far future we are going to implement a more efficient revision system where individual changes are tracked and redundancy is avoided.

## Getting started

Install

    git clone https://github.com/mstn/gup.git
    cd gup
    npm install

Make sure that the target MongoDB is up and running.  

## CLI

Executable file is in bin directory. You might want to add this directory to your PATH.

Upload a dataset to MongoDB

     gup load -u mongodb://localhost:27017 -d test -t agency_one_suburban -s 2015-09-01 -e 2016-12-31 dataset1.zip

List existing dataset with revisions and tags

     gup list -u mongodb://localhost:27017 -d test -t agency_one_suburban

Update a meta-property for an existing dataset

     gup update -u mongodb://localhost:27017 -d test -t agency_one_suburban -r 9 -p start 2010-08-12

### Zone file

Some GTFS files (e.g. fare_rules, stops) can have an optional field called zone_id. This field is just a unique identifier for fare zones. The standard does not say more about fare zones.

However, it is useful to have a reference table with more information about fare zones (e.g. name and description for each zone). For this reason, we can specify an additional option in order to include a zone file in our dataset.

     gup update -u mongodb://localhost:27017 -d test -t agency_one_suburban -r 9 -p start 2010-08-12 -z zones.txt

Zones.txt is an arbitrary csv file with a zone_id field. The definition of the other fields is left to users.

## Examples

Suppose we want to manage serveral gtfs datasets from different sources. For example,

* dataset1 from agency1 that covers suburban transport;
* dataset2 from agency1 that covers urban transport;
* dataset3 from agency2.

We can upload the three datasets with a tag and period of validity.

     gup load -u mongodb://localhost:27017 -d test -t agency_one_suburban -s 2015-09-01 -e 2016-12-31 dataset1.zip

     gup load -u mongodb://localhost:27017 -d test -t agency_one_urban -s 2015-09-01 -e 2016-12-31 dataset2.zip

     gup load -u mongodb://localhost:27017 -d test -t agency_two -s 2015-09-01 -e 2016-12-31 dataset3.zip

A tag identifies a datasets and, when a dataset with an existing tag is uploaded a second time, a new entry with the same tag but larger revision number is added.

In this way no data is deleted and it is possible to switch to an older version of the same dataset.

A client application is supposed to restrict searches to a pair of tag and revision for each gtfs entity.

## Credits

Followed [node-gtfs](https://github.com/brendannee/node-gtfs/blob/master/scripts/download.js) implementation, but the goal of this project is different.

## License

MIT
