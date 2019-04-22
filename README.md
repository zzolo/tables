# Tables

Tables is a simple command-line tool and powerful library for importing data like a CSV or JSON file into relational database tables. The goal is to make data import easy, configurable, and stable for large datasets into a relational database for better analysis.

[![Image showing build status with Travis CI](https://travis-ci.org/zzolo/tables.svg?branch=master "Build Status")](https://travis-ci.org/zzolo/tables) [![Image showing status of NPM depencies](https://david-dm.org/zzolo/tables.svg)](https://david-dm.org/zzolo/tables "Dependencies")
[![Image showing license for project](https://img.shields.io/npm/l/tables.svg "License")]()

![Animated gif showing basic usage of Tables](https://github.com/zzolo/tables/raw/master/docs/tables-examples.terminalizer.gif "Basic Tables usage")

## Install

- To include as a library: `npm install tables`
- To use as a command-line tool: `npm install -g tables`
  - Or you can use directly via `npx`: `npx tables ...`

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
- `--transformer`: Point to a JS module that exports a function to transform the data before being loaded into the database. See _transformer_ documentation below.
- `--models`: Point to a JS module that exports a function to define the database models (table layout). See _models_ documentation below.
- `--no-transactions`: Turn off transactions. Each batch is a single transaction.
- `--no-optimize`: Turn off optimizations that run before and after database inserts/updates are made. For very large datasets, optimizing could add a significant amount of time Tables takes.
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

Or, use the [FEC bulk downloads](https://www.fec.gov/data/browse-data/?tab=bulk-data) to get candidates from a specific year. The format that the bulk data comes in is pipe (`|`) delimited and does not have headers, but we can account for that with specific arguments.

```sh
curl -L --silent "https://www.fec.gov/files/bulk-downloads/2020/weball20.zip" \
| funzip \
| tables --db="sqlite://examples/fec-bulk.sqlite" \
  --table-name="candidates" \
  --key="CAND_ID" \
  --csv-delimiter="|" \
  --csv-headers="CAND_ID,CAND_NAME,CAND_ICI,PTY_CD,CAND_PTY_AFFILIATION,TTL_RECEIPTS,TRANS_FROM_AUTH,TTL_DISB,TRANS_TO_AUTH,COH_BOP, COH_COP,CAND_CONTRIB,CAND_LOANS,OTHER_LOANS,CAND_LOAN_REPAY,OTHER_LOAN_REPAY,DEBTS_OWED_BY,TTL_INDIV_CONTRIB,CAND_OFFICE_ST,CAND_OFFICE_DISTRICT,SPEC_ELECTION,PRIM_ELECTION,RUN_ELECTION,GEN_ELECTION,GEN_ELECTION_PRECENT,OTHER_POL_CMTE_CONTRIB,POL_PTY_CONTRIB,CVG_END_DT,INDIV_REFUNDS,CMTE_REFUNDS"
```

Load in 600k+ rows of [ordinance violations in Chicago](https://data.cityofchicago.org/Administration-Finance/Ordinance-Violations/6br9-quuz). This specific examples expands on what fields will be indexed. Indexing will make the database loading a bit slower and will increase disk size (this produced a 500MB+ file), but will make queries faster. We also update the model guessing size which helps alleviates issues with guessing field length. And then update the batch size which may help speed things up, though this is dependent on may things.

```sh
curl -L --silent "https://data.cityofchicago.org/api/views/6br9-quuz/rows.csv?accessType=DOWNLOAD" \
| tables \
  --db="sqlite://examples/chicago.sqlite" \
  --table-name="ordinance_violations" \
  --key="ID" \
  --guess-size=1000 \
  --batch-size=1000 \
  --index-fields=".*date,.*name,.*number,.*disposition,.*fine,.*cost,.*code,latitude,longitude,.*borough,status" \
  --overwrite \
  --yes
```

## Library use

Include like most libraries:

```js
const { Tables } = require("tables");
```

Import in a CSV file:

```js
// Define instance
let t = new Tables({
  input: "./examples/nyc-water-quality-complaints.csv",
  db: "sqlite://examples/nyc-water-complaints.sqlite",
  // If running as a library, you probably want to supress the output
  silent: true
});

// Run import
await t.start();
```

### Library options

- `models`: This is how the database tables are defined. If this is left empty, Tables will try to guess this from some of the data. We use [Sequelize models](http://docs.sequelizejs.com/manual/models-definition.html) to help abstract things for different database. Data types are the types supported by [Sequelize types](http://docs.sequelizejs.com/manual/data-types.html). The only different is that you can attach a `tablesInputColumn` property to each field to help with auto-transforming.

  - Argument `databaseConnection`: This is the Sequelize instance.
  - Argument `Sequelize`: This is the Sequelize library for getting the data types from.
  - Argument `options`: The options that were passed to the Tables object.
  - Context: The context of the function should be the Tables object.
  - Returns: The function should return an object of Sequelize Models.
  - Example:

    ```js
    ...
    models: (db, Sequelize, options) {
      class ExampleModel extends Sequelize.Model {}
      ExampleModel.init(
        {
          id: {
            // This is our only custom field that will help the auto
            // transformer know how to match up fields
            tablesInputColumn: 'Unique Key',
            // Field describes the column name in the database
            field: 'id',
            type: Sequelize.STRING(128),
            primaryKey: true
          },
          type: {
            tablesInputColumn: 'Complaint Type',
            field: 'type',
            type: Sequelize.STRING(128)
          },
          description: {
            tablesInputColumn: 'Descriptor',
            field: 'description',
            type: Sequelize.TEXT
          }
        },
        {
          sequelize: db,
          tableName: 'example_model',
          indexes: [
            // These need to be the field name, not the
            // sequelize name
            fields: ['type', 'description']
          ]
          // These are suggested, but not necessary
          timestamps: false,
          underscored: true,
          freezeTableName: true
        }
      );

      return {
        // The key here is important if writing your own
        // transformer
        exampleModel: ExampleModel,
        // You could have multiple models/tables
        // anotherTable: AnotherTable,
        // lookupTable: LookupTable
      };
    }
    ...
    ```

- `transformer`: Custom transform function that will get run before loading data into the database. If not provided, Tables will use the an automatic transform function that uses the models to try to match up columns. The context is the Tables object and arguments are:

  - Argument `data`: Data coming from format pipe.
  - Argument `models`: Models configuration. If the `models` options is not provided, the transformer function gets run when guessing models, so this will be undefined when that happens.
  - Argument `options`: Options that were given or configured by the Tables object.
  - Context: The context of the function will be the Tables object.
  - Returns: Should return transformed data, an object where each key correspondes to a model, and each value is the row of data to insert/update.
  - For example:

    ```js
    ...
    transformer: (data, models, options) {
      return {
        modelName: {
          id: data['Unique Key'],
          thing: data.t + 1,
          other: data['OTHER']
        }
      };
    }
    ...
    ```

- `formatOptions`: Options to pass to the stream parser. This will depend on what `inputType` option is given and the defaults change on that as well. See [tito](https://github.com/shawnbot/tito) for full options.

  - The CSV parser is [fast-csv](https://github.com/C2FO/fast-csv)
  - The JSON parser is [JSONstream](https://github.com/dominictarr/JSONStream) and should be in a format like `{ path: "*" }`.
  - The HTML table parser can use a CSS selector to get the table with some like `{ selector: ".table" }`

- `fieldsToIndex`: Used if guessing models (i.e. `models` options is not provided). This should be a JS regular expression or a string version of a regular expression.
- `dbOptions`: Tables uses [Sequelize](http://sequelize.readthedocs.org/) as its ORM to more easily support multiple database backends. This options is an object that goes into `new Sequelize(uri, options)`. Defaults in here are important for regular Tables usage.
- `hooks`: An object of functions that get run at certain points during Tables lifecycle. All hooks pass the `sequelize`, `models`, and `options` object, with the Tables instance as the context. The following are the supported hooks:
  - `finish`: Run right before the final optimize step. Helpful for database updates that can't be performed during import.

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

## Credits

Tables was worked on while I worked at WNYC and Star Tribune.
