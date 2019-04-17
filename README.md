# Tables

Tables is a simple command-line tool and powerful library for importing data like a CSV or JSON file into relational database tables. The goal is to make data import easy, configurable, and stable for large datasets into a relational database for better analysis.

[![Build Status](https://travis-ci.org/zzolo/tables.svg?branch=master)](https://travis-ci.org/zzolo/tables) [![Dependencies](https://david-dm.org/zzolo/tables.svg)](https://david-dm.org/zzolo/tables)
[![License](https://img.shields.io/npm/l/tables.svg)]()

![Animated gif showing basic usage of Tables](https://github.com/zzolo/tables/raw/master/docs/tables-examples.terminalizer.gif "Basic Tables usage")

## Install

- To include as a library: `npm install tables`
- To use as a command-line tool: `npm install -g tables`

## Features

- Automatic data type guessing.
- Automatic indexes guessing.
- Efficient memory and CPU usage utilizing Node streams.
- Supports CSV-ish, JSON, NDJSON, and HTML table data sources (utilizes [tito](https://github.com/shawnbot/tito)).
- Default use of SQLite so no need to setup a database server.
- (Needs re-do) Resumable (currently only works for CSV in input mode).
- Sane defaults.
- Supports MySQL, Postgres, and SQLite.
  - Untested in MSSQL
- Useful, pretty output

## Command line usage

The command line version can handle most of the simple options that the library uses. A simple example that reads in a CSV named `filename.csv` will produce an SQLite database at `filename.sqlite`.

```bash
tables -i filename.csv
```

### CLI options

Use the `--help` option to get a full, up-to-date look at what the options are, but here are most of them for reference:

- `--help`: Shows help message.
- `--version`: Outputs version.
- `--input`: The input file to use. Tables also can use a piped in source as well, if this is not provided. See _Pipe_ section below.
- `--db`: The database URI to push data into. By default, Tables will use the input option to create a SQLite database with the same path with a `.sqlite` extension, or for piping, it will create an SQLite database name `tables-import.sqlite` where the command is run. If you are using a password to access your database please consider using the `TABLES_DB_URI` environment variable for security reasons. Examples:
  - `--db="sqlite://./my-new-db.sql"`
  - `--db="mysql://username:password@localhost/my-database"`
  - `--db="postgres://username:@localhost:1234/my-database"`
- `--format`: Force type of parsing. This is determined from filename and defaults to `csv`. Valid values are `csv`, `tsv`, `json`, `ndjson`, `html`.
- `--key`: Creates a unique key from columns if the models options in config is not provided. This is a **suggested option** as it allows for data to be updated as opposed to being added to. You can use a comma-delimited list of columns for a multi-column key, like "column 1,other,thing". Do note that this option only works if not manually defining the model, specifically in a config file.
- `--index-fields`: Defines which fields will be indexed. By default this looks fields that end in "key", "id", or "name".
  - Provide a JS regular expression that starts with `/`, for example `/^(key|column)$`.
  - Or provide a comma-separated list of columns or regular-expression-like values, such as `key|column_1` or `.*key|.*id`.
- `--table-name`: Specify name of table importing into. By default, Tables uses the file name if provided, or `tables_import` for piping data. Do note that this option only works if not manually defining the model, specifically in a config file.
- `--silent`: No output except errors.
- `--overwrite`: **WARNING: DELETES DATA** Removes existing data and tables. Use this is you don't have a unique key, `--key` option, defined or if your model has changed.
- `--batch-size`: Numbers of rows to import at once. Default is `500`. Use lower or higher numbers depending on the database and how it is configured.
- `--guess-size`: Numbers of rows to use for guessing model. Default is `500`. Use lower or higher numbers depending on the database and how it is configured.
- `--csv-headers`: Use the keyword, false, if there are no headers. Or use a comma separated list of headers. Defaults to reading headers from file. Forces type to CSV.
- `--csv-delimiter`: CSV delimiter character. Defaults to `,`. If you need to use a tab character, use `--csv-delimiter=$'\t'`. Forces type to CSV.
- `--csv-quote`: CSV quote character. Defaults to `"`. Forces type to CSV.
- `--json-path`: JSON path to use for parsing rows. Default is `*`. See [JSONStream](https://github.com/dominictarr/JSONStream). Forces type to CSV.
- `--html-selector`: CSS selector to target specific table when using the `html` type.
- `--date-format`: Date format to use when guessing date columns and parsing data. Defaults to `MM/DD/YYYY`. See [moment.js](http://momentjs.com/docs/) for options.
- `--datetime-format`: Datetime format to use when guessing date columns and parsing data. Defaults to `MM/DD/YYYY HH:mm:ss a`. See [moment.js](http://momentjs.com/docs/) for options.
- `--transformer`: Point to a JS module that exports a function to transform the data before being loaded into the database.
- `--config`: Allows to use a JS file that exports configuration for Tables. Any other options will override the values in the file. This allows for options that are not easily supported on a command line. See _Options_ section under _Library Use_.

### Piping

Piping in data is supported. It should be noted that a couple things happen with piping. A bit more memory is used if guessing models. A progress bar with time estimate cannot be used since we can't know how much data is in total. Without an input file and certain options not defined, the default SQLite file will be `tables-import.sql` and table name of `tables_import`.

```sh
cat filename.json | tables -f json
```

### Examples

Get data from the NYC Data Portal about water quality complaints and then create an SQLite database of the same name. This will create `examples/nyc-water-quality-complaints.sql` with a `nyc_water_quality_complaints` table that has all the data.

```sh
$ curl --silent "https://data.cityofnewyork.us/api/views/qfe3-6dkn/rows.csv" | tables --db="sqlite://nyc-water-quality-complaints.sqlite" --table-name="nyc_water_complaints";
$ sqlite3 nyc-water-quality-complaints.sqlite
sqlite> .tables
sqlite> SELECT * FROM nyc_water_complaints;
```

Put my Github followers into an SQLite database named `github.sql` and table name `followers`:

```sh
curl --silent "https://api.github.com/users/zzolo/followers" | tables --format="json" --db="sqlite://./examples/github.sqlite" --table-name="followers" --key="id";
```

Using a little script to turn a paging API into [ndjson](http://ndjson.org/), we can get all 40k+ candidates from the [FEC API](https://api.open.fec.gov/developers/).

```sh
FEC_API_KEY=xxxxx node examples/api-pager.js --uri="https://api.open.fec.gov/v1/candidates/?per_page=100&page=[[page]]&api_key=$FEC_API_KEY" --results="results" --page="pagination.page" --pages="pagination.pages" | tables --db="sqlite://examples/fec.sqlite" --table-name="candidates" --key="candidate_id"
```

Or, use the [FEC bulk downloads](https://www.fec.gov/data/browse-data/?tab=bulk-data) to get candidates from a specific year:

```sh
curl -L --silent "https://www.fec.gov/files/bulk-downloads/2020/weball20.zip" | funzip | tables --db="sqlite://examples/fec-bulk.sqlite" --table-name="candidates" --key="CAND_ID" --csv-delimiter="|" --csv-headers="CAND_ID,CAND_NAME,CAND_ICI,PTY_CD,CAND_PTY_AFFILIATION,TTL_RECEIPTS,TRANS_FROM_AUTH,TTL_DISB,TRANS_TO_AUTH,COH_BOP, COH_COP,CAND_CONTRIB,CAND_LOANS,OTHER_LOANS,CAND_LOAN_REPAY,OTHER_LOAN_REPAY,DEBTS_OWED_BY,TTL_INDIV_CONTRIB,CAND_OFFICE_ST,CAND_OFFICE_DISTRICT,SPEC_ELECTION,PRIM_ELECTION,RUN_ELECTION,GEN_ELECTION,GEN_ELECTION_PRECENT,OTHER_POL_CMTE_CONTRIB,POL_PTY_CONTRIB,CVG_END_DT,INDIV_REFUNDS,CMTE_REFUNDS"
```

## Library use

Include like most libraries:

```js
const { Tables } = require("tables");
```

Import in a CSV file:

```js
var t = new Tables({
  input: "./tests/data/nyc-water-quality-complaints.csv"
});
```

### Library options

- `models`: This is how the database tables are defined. If this is left empty, Tables will try to guess this from some of the data. We use [Sequelize models](http://docs.sequelizejs.com/manual/models-definition.html) to help abstract things for different database. Data types are the types supported by [Sequelize types](http://docs.sequelizejs.com/manual/data-types.html). Overall, the `models` definition is just the options you would normally pass to Sequelize with a little extra.

```js
  {
    "modelName": {
      // Fields are the same field definitions for Sequelize with a couple extra parts
      // See: http://docs.sequelizejs.com/manual/models-definition.html
      fields: {
        field1: {
          // Input field.  Used for auto-transforming of the data
          tablesInputColumn: "Field Name From Input Like CSV",
          // The database column name (optional)
          field: "db_column_name",
          // Sequelize type
          type: new Sequelize.String(64)
          // Any other sequelize options
          // ....
        },
        field_number: {
          input: "Some Number Fld",
          name: "db_field_number",
          type: new Sequelize.BIGINT
        }
      },
      // Options for defining a Sequelize model
      // See: http://docs.sequelizejs.com/manual/models-definition.html
      options: {
        indexes: [
          {
            // This should be the db column name
            fields: ["db_column_name", "db_field_number"],
            unique: true
          }
        ],
        // Repeated from key
        modelName: "modelName",
        tableName: "db_table_name",
        // Any other sequelize options
        // ....
      }
    },

    // There can be more than one model
    "anotherModel": {
      tableName: "another_table",
      ...
    }
  }
```

- `formatOptions`: Options to pass to the stream parser. This will depend on what `inputType` option is given and the defaults change on that as well. See [tito](https://github.com/shawnbot/tito) for full options.
  - The CSV parser is [fast-csv](https://github.com/C2FO/fast-csv)
  - The JSON parser is [JSONstream](https://github.com/dominictarr/JSONStream) and should be in a format like `{ path: "*" }`.
  - The HTML table parser can use a CSS selector to get the table with some like `{ selector: ".table" }`
- `transformer`: Custom transform function that will get run before loading data into the database. If not provided, Tables will use the an automatic transform function that uses the models to try to match up columns. The context is the Tables object and arguments are:
  - `data`: Data coming from format pipe.
  - `models`: Models configuration.
  - `options`: Options that were given or configured by the Tables object.
- `fieldsToIndex`: Used if guessing models (i.e. `models` options is not provided). This should be a JS regular expression or a string version of a regular expression.
- `dbOptions`: Tables uses [Sequelize](http://sequelize.readthedocs.org/) as its ORM to more easily support multiple database backends. This options is an object that goes into `new Sequelize(uri, options)`. Defaults in here are important for regular Tables usage.

The following are all options that correspond to command-line options; see that section for more description.

| Library option   | CLI option          | Notes                                                                              |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `input`          | `--input`           |                                                                                    |
| `format`         | `--format`          |                                                                                    |
| `db`             | `--db`              | Suggested to use `TABLES_DB_URI` environment variable if you are using a password. |
| `tableName`      | `--table-name`      |                                                                                    |
| `key`            | `--key`             |                                                                                    |
| `batchSize`      | `--batch-size`      |                                                                                    |
| `guessSize`      | `--guess-size`      |                                                                                    |
| `dateFormat`     | `--date-format`     |                                                                                    |
| `datetimeFormat` | `--datetime-format` |                                                                                    |
| `overwrite`      | `--overwrite`       |                                                                                    |
| `silent`         | `--silent`          |                                                                                    |

## Tests

Tests are run through mocha; after a `npm install`, do the following:

```bash
npm run test
```
