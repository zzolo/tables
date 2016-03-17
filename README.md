# Tables

**Still under active development**

Tables is a simple command-line tool and powerful library for importing data like a CSV or JSON file into relational tables.  The goal is to make data import easy, configurable, and stable for large datasets into a relational database for better analysis.

## Install

* To include as a library: `npm install tables`
* To use as a command-line tool: `npm install -g tables`

*Note*: Currently this module does not support node 5.x.  This is because we have experienced issues with [node-sqlite3](https://github.com/mapbox/node-sqlite3/issues/581), the library that handles the SQLite connection.  If you seen an error like `Cannot find module '[..]/node_modules/sqlite3/lib/binding/node-v47-darwin-x64/node_sqlite3.node'`, it probably means you should switch versions of node (try [n](https://www.npmjs.com/package/n)).  If you don't need SQLite support, then node 5.x should work fine.

## Features

* Automatic data type guessing.
* Automatic indexes guessing.
* Default use of SQLite so need to setup a database server.
* Resumable (currently only works for CSV in input mode).
* Supports CSV-ish and JSON data sources.
* Sane defaults.
* Supports MySQL, Postgres, and SQLite.
* Verbose, structured output.

## Command line use

The command line version can handle most of the simple options that the library uses.  A simple example that will read in a CSV and create an SQLite database name `nyc-water-quality-complaints.sql` with a `nyc_water_quality_complaints` table with the converted data.

```
tables -i examples/nyc-water-quality-complaints.csv
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
* `--silent`: No output except errors.
* `--data`: Path to data file for resuming streams.  Defaults to ~/.tables-data.
* `--id`: ID to use for resuming stream; if an input file is provided, the filename is used.
* `--restart`: Restart any resuming as well as remove existing data and tables.  **WARNING: DELETES DATA**  Use this is you don't have a unique key defined or if your model has changed.
* `--batch-size`: Numbers of rows to import at once. Default is 1000.  Use lower or higher numbers depending the database and how it is configured.
* `--type`: Force type of parsing.  This is determined from filename and defaults to CSV.
* `--csv-headers`: Use the keyword, false, if there are no headers. Or use a comma separated list of headers. Defaults to reading headers from file.  Forces type to CSV.
* `--csv-delimiter`: CSV delimiter character.  Defaults to `,`.  Forces type to CSV.
* `--csv-quote`: CSV quote character.  Defaults to `"`.  Forces type to CSV.
* `--json-path`: JSON path to use for parsing rows. Default is `*`.  See [JSONStream](https://github.com/dominictarr/JSONStream).  Forces type to CSV.
* `--date-format`: Date format to use when guessing date columns and parsing data.  Defaults to `MM/DD/YYYY`.  See [moment.js](http://momentjs.com/docs/) for options.
* `--datetime-format`: Datetime format to use when guessing date columns and parsing data.  Defaults to `MM/DD/YYYY HH:mm:ss a`.  See [moment.js](http://momentjs.com/docs/) for options.
* `--config`: Allows to use a JS file that exports configuration for Tables.  Any other options will override the values in the file.  This allows for options that are not easily supported on a command line.

The following options only apply when guessing the model (when `options.models` is not defined).  This would only be the case if the `--config` option was used and models was defined.

* `--table-name`: Specify name of table importing into.  By default, Tables uses the file name.
& `--key`: Creates a unique key from columns if the models options in config is not provided.  This is a *suggested option* as it allows for data to be updated as opposed to being added to.  Use a comma-delimited list of columns, like "column 1,other,thing".

### Piping

Piping in data is supported.  It should be noted that a couple things happen with piping.  A bit more memory is used if guessing models.  A progress bar with time estimate cannot be used since we can't know how much data is in total.  Without an input file and certain options not defined, the default SQLite file will be `tables-import.sql` and table name of `tables_import`.

### Examples

Get data from the NYC Data Portal about water quality complaints and then create an SQLite database of the same name.  This will create `examples/nyc-water-quality-complaints.sql` with a `nyc_water_quality_complaints` table that has all the data.

```
wget "https://data.cityofnewyork.us/api/views/qfe3-6dkn/rows.csv?accessType=DOWNLOAD" -O examples/nyc-water-quality-complaints.csv;
tables -i examples/nyc-water-quality-complaints.csv;
```

Put my Github followers into an SQLite database named `github.sql` and table name `followers`:

```
curl --silent https://api.github.com/users/zzolo/followers | ./bin/tables --type=json --db="sqlite://./examples/github.sql" --table-name=followers --key="id";
```

Or use the Twitter command line tool, t, to save your timeline to a database.

```
t timeline -n 1000 --csv | tables --db="sqlite://examples/twitter.sql" --table-name=timeline --datetime-format="YYYY-MM-DD HH:mm:ss Z" --key="id"
```

The following are examples of getting FEC campaign finance data and putting them into a MySQL database named `fec`.  In this example the `id` flag is not useful for piping data, but helps us keep track which statement is which.

```
curl --silent ftp://ftp.fec.gov/FEC/2016/cm16.zip | funzip | \
tables --id="fec-committee-master" --csv-delimiter="|" \
--csv-headers="CMTE_ID,CMTE_NM,TRES_NM,CMTE_ST1,CMTE_ST2,CMTE_CITY,CMTE_ST,CMTE_ZIP,CMTE_DSGN,CMTE_TP,CMTE_PTY_AFFILIATION,CMTE_FILING_FREQ,ORG_TP,CONNECTED_ORG_NM,CAND_ID" \
--key="CMTE_ID" --table-name="fec_committees" \
--db="mysql://root:@127.0.0.1/fec";

curl --silent ftp://ftp.fec.gov/FEC/2016/cn16.zip | funzip | \
tables --id="fec-candidate-master" --csv-delimiter="|" \
--csv-headers="CAND_ID,CAND_NAME,CAND_PTY_AFFILIATION,CAND_ELECTION_YR,CAND_OFFICE_ST,CAND_OFFICE,CAND_OFFICE_DISTRICT,CAND_ICI,CAND_STATUS,CAND_PCC,CAND_ST1,CAND_ST2,CAND_CITY,CAND_ST,CAND_ZIP" \
--key="CAND_ID" --table-name="fec_candidates" \
--db="mysql://root:@127.0.0.1/fec";

curl --silent ftp://ftp.fec.gov/FEC/2016/indiv16.zip | funzip | \
tables --id="fec-indiv-contributions" --csv-delimiter="|" \
--csv-headers="CMTE_ID,AMNDT_IND,RPT_TP,TRANSACTION_PGI,IMAGE_NUM,TRANSACTION_TP,ENTITY_TP,NAME,CITY,STATE,ZIP_CODE,EMPLOYER,OCCUPATION,TRANSACTION_DT,TRANSACTION_AMT,OTHER_ID,TRAN_ID,FILE_NUM,MEMO_CD,MEMO_TEXT,SUB_ID" \
--key="SUB_ID" --table-name="fec_indiv_contributions" --date-format="MMDDYYYY" \
--batch-size=2000 --db="mysql://root:@127.0.0.1/fec";
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
