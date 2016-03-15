# Tables

**Still under active development**

Tables is a simple command-line tool and powerful library for importing data like a CSV or JSON file into relational tables.  The goal is to make data import easy, configurable, and stable for large datasets into a relational database for better analysis.

## Install

1. To include as a library: `npm install tables`
1. To use as a command-line tool: `npm install -g tables`

## Features

* Automatic data type guessing.
* Automatic indexes guessing.
* Automatic default use of SQLite so need to setup a database server.
* Supports MySQL, Postgres, and SQLite.
* Verbose, structure output to make sure the process is running smoothly.

## Command line use

The command line version can handle most of the simple options that the library uses.  A simple example that will read in a CSV and create an SQLite database name `nyc-water-quality-complaints.sql` with a `nyc_water_quality_complaints` table with the converted data.

```
tables -i tests/data/nyc-water-quality-complaints.csv
```

### Options

Use the `--help` option to get a full, up-to-date look at what the options are, but here are most of them for reference:

* `--help`: Shows help message.
* `--version`: Outputs version.
* `--input`: The input file to use.  Tables also can use a stdin source as well if this is not provided.
* `--output`: By default, Tables will create a `.sql` SQLite database with the same base as the input file provided, if there is not a `TABLES_DB_URI` environment variable provided.  This option allows you to override all that and output into a specifically named SQLite file.
* `--table-name`: Specify name of table importing into.  By default, Tables uses the file name.
* `--silent`: No output except errors.
* `--config`: Allows to use a JS file that exports configuration for Tables.  Any other options will override the values in the file.  This allows for options that are not easily supported on a command line.


## Library use

Include like most libraries:

```
var Tables = require("tables");
```

Import in a CSV file:

```
var t = new Tables({
  input: "./tests/data/nyc-water-quality-complaints.csv"
});
```

## Tests

Coming soon.


### Data

* Water quality complaints: `wget "https://data.cityofnewyork.us/api/views/qfe3-6dkn/rows.csv?accessType=DOWNLOAD" -O tests/data/nyc-water-quality-complaints.csv`

## Publishing

1. Update `package.json` with the new version.
1. `git tag X.X.X`
1. `git push origin master --tags`
1. `npm publish`
