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
* `--input`: The input file to use.  Tables also can use a piped in source as well, if this is not provided.
* `--db`: The database URI to push data into.  By default, Tables will use the input option to create a SQLite database with the same path with a `.sql` extension, or for piping, it will create an SQLite database name `tables-import.sql` where the command is run.  If you are using a password to access your database please consider using the  `TABLES_DB_URI` environment variable for security reasons.  Examples:
    * `--db="sqlite://./my-new-db.sql"`
    * `--db="mysql://username:password@localhost/my-database"`
    * `--db="postgres://username:@localhost:1234/my-database"`
* `--table-name`: Specify name of table importing into.  By default, Tables uses the file name.
& `--key`: Creates a unique key from columns if the models options in config is not provided.  This is a *suggested option* as it allows for data to be updated as opposed to being added to.  Use a comma-delimited list of columns, like "column 1,other,thing".
* `--silent`: No output except errors.
* `--config`: Allows to use a JS file that exports configuration for Tables.  Any other options will override the values in the file.  This allows for options that are not easily supported on a command line.

### Piping

Piping in data is supported.  It should be noted that a couple things happen with piping.  A bit more memory is used if guessing models.  A progress bar with time estimate cannot be used since we can't know how much data is in total.  Without an input file and certain options not defined, the default SQLite file will be `tables-import.sql` and table name of `tables_import`.

```
in2csv example.xls | tables
```

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
