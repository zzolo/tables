#! /usr/bin/env node

// Dependencies
const path = require('path');
const command = require('commander');
const _ = require('lodash');
const chalk = require('chalk');
const inquirer = require('inquirer');
const debug = require('debug')('tables:cli');
const { Tables } = require('../index.js');
const pkg = require('../package.json');

// Basic command line parts
command.description(pkg.description).version(pkg.version);

// Options
command.option('-i, --input [file]', 'Input file to use.');
command.option(
  '-d, --db [uri]',
  `The database URI to push data into.  By default, Tables will use
                                  the input option to create a SQLite database with
                                  the same path with a .sql extension, or for piping,
                                  it will create an SQLite database name tables-import.sql
                                  where the command is run. If you are using a password
                                  to access your database please consider using the
                                  TABLES_DB_URI environment variable for security reasons.`
);
command.option(
  '-f, --format [format]',
  `Input type; determined from file name if not provided.  Valid
                                  values are csv, tsv, json, ndjson, html, or custom.  Defaults
                                  to csv if could not be determined.`
);
command.option(
  '-e, --csv-headers [headers]',
  `Use the keyword, "false", if there are no headers.
                                  Or use a comma separated list of headers. Defaults
                                  to reading headers from file.`
);
command.option(
  '-l, --csv-delimiter [char]',
  `CSV delimiter character.  For tabs, use
                                  --csv-delimiter=$'\\t'.  Defaults to ","`
);
command.option('-q, --csv-quote [char]', 'CSV quote character.  Defaults to "');
command.option(
  '-j, --json-path [path]',
  `JSON path to use for parsing rows. Default is "*".  See JSONStream
                                  library for more info.`
);
command.option(
  '-H, --html-selector [path]',
  'CSS selector to target specific HTML table for html input type.'
);
command.option(
  '-n, --table-name [name]',
  'Use a specific table name.  By default the name of the input file is used.'
);
command.option(
  '-k, --key [name]',
  `This is suggested.  A comma-delimited list of columns that
                                  define a unique key.  A unique key means that data can
                                  be updated instead of added to.  Should be used if models is not defined.`
);
command.option(
  '-I, --index-fields [regex|string]',
  `Fields to add indexes for; note that too many indexes will make database
                                  inserts slow and increase disk-size of the databse.  Should be either a JS regular
                                  expression that starts with "/", for example "/^(key|column)$" or can be a
                                  comma-delimited list of columns such as "key|column_1" or ".*key|.*id".`
);
command.option(
  '-t, --transformer [file]',
  `Reference to JS file that exports a function to transform data
                                  guessing model if models not provided, as we well as before db
                                  inserts.`
);
command.option(
  '-m, --models [file]',
  `Reference to JS file that exports a function to that returns a set
                                  of Sequelize models.`
);
command.option(
  '-a, --date-format [format]',
  `Date format to use when guessing date columns
                                  and parsing data.  Defaults to MM/DD/YYYY.  See moment.js for options.`
);
command.option(
  '-A, --datetime-format [format]',
  `Date and time format to use when
                                  guessing datetime columns and parsing data.  Defaults to MM/DD/YYYY HH:mm:ss a.
                                  See moment.js for options.`
);
// command.option(
//   '-p, --data [file]',
//   'Path to data file for resuming streams.  Defaults to ~/.tables-data'
// );
// command.option(
//   '-z, --id [name]',
//   `ID to use for resuming stream; if an input file is provided,
//                                   this is used.  For CSV only.`
// );
command.option(
  '-b, --batch-size [num]',
  'Numbers of rows to import at once. Default is 500'
);
command.option(
  '-g, --guess-size [num]',
  'Numbers of rows to use to guess model from. Default is 300'
);
command.option(
  '-o, --overwrite',
  `WARNING: Restarts any resuming, deletes existing data, and existing
                                  tables in DB.  If using pipe data, you
                                  must set --yes, since an interactive prompt
                                  is not available.`
);
command.option('-y, --yes', 'Answers affirmative to things like --overwrite.');
command.option(
  '--no-transactions',
  `Turn off using transactions when loading data into the database.  If you don't
                                  use transactions, row count and resuming may not be accurate.`
);
command.option(
  '--no-optimize',
  `Turn off optimizing tables before and after data is loaded into the database.
                                  For very large datasets, optimizing could add a significant amount of time.`
);
command.option('-s, --silent', 'Suppress output besides errors.');
// command.option('-u, --debug', 'Output stack trace if available.');
command.option(
  '-c, --config [file]',
  `Provide a JS file that exports configuration for Tables.
                                  This allows for the options that are not supported in the command line.`
);

// Parse
command.parse(process.argv);

// Main execution
async function cli() {
  let t;

  // Make options for tables
  let options = {
    input: command.input ? command.input : undefined,
    db: command.db ? command.db : undefined,
    format: command.format ? command.format : undefined,
    tableName: command.tableName ? command.tableName : undefined,
    key: command.key
      ? _.map(command.key.split(','), d => _.snakeCase(d.trim()))
      : undefined,
    id: command.id ? command.id : undefined,
    fieldsToIndex:
      command.indexFields && command.indexFields.match(/^\//)
        ? command.indexFields
        : command.indexFields
          ? new RegExp(`^(${command.indexFields.replace(/,/g, '|')})$`, 'i')
          : undefined,
    dateFormat: command.dateFormat ? command.dateFormat : undefined,
    datetimeFormat: command.datetimeFormat ? command.datetimeFormat : undefined,
    batch: command.batchSize ? parseInt(command.batchSize, 10) : undefined,
    guess: command.guessSize ? parseInt(command.guessSize, 10) : undefined,
    restart: !!command.restart,
    transactions:
      command.transactions === undefined ? true : !!command.transactions,
    optimize: command.optimize === undefined ? true : !!command.optimize,
    silent: !!command.silent,
    overwrite: !!command.overwrite,
    transformer: command.transformer ? command.transformer : undefined,
    models: command.models ? command.models : undefined
  };

  // Input type specific options
  if (command.jsonPath) {
    options.format = 'json';
    options.formatOptions = { path: command.jsonPath };
  }
  if (command.htmlSelector) {
    options.format = 'html';
    options.formatOptions = { selector: command.htmlSelector };
  }
  if (command.csvDelimiter || command.csvQuote) {
    options.format = 'csv';
    options.formatOptions = {
      headers:
        command.csvHeaders && command.csvHeaders.match(/false/i)
          ? false
          : command.csvHeaders && command.csvHeaders.toLowerCase() === 'true'
            ? undefined
            : command.csvHeaders
              ? command.csvHeaders.split(',')
              : undefined,
      delimiter: command.csvDelimiter ? command.csvDelimiter : undefined,
      quote: command.csvQuote ? command.csvQuote : undefined
    };
  }
  if (options.transformer) {
    try {
      options.transformer = require(path.resolve(options.transformer));
    }
    catch (e) {
      handleError(
        e,
        t,
        `Issue trying to find or parse transformer file: ${chalk.red(
          e.toString()
        )}`
      );
    }
  }
  if (options.models) {
    try {
      options.models = require(path.resolve(options.models));
    }
    catch (e) {
      handleError(
        e,
        t,
        `Issue trying to find or parse models file: ${chalk.red(e.toString())}`
      );
    }
  }

  // Handle config file
  if (command.config) {
    try {
      options = _.defaultsDeep(options, require(path.resolve(command.config)));
    }
    catch (e) {
      handleError(
        e,
        t,
        `Unable to read in config file: ${chalk.red(e.toString())}`
      );
    }
  }

  // Debug
  debug(options);

  // Confirm overwrite if no force flag and not pipe
  if (process.stdin.isTTY && options.overwrite && !command.yes) {
    let prompt = await inquirer.prompt([
      {
        name: 'overwrite',
        message:
          'Are you sure you want to overwrite the data and tables in the database? ',
        type: 'confirm',
        default: false
      }
    ]);

    if (!prompt.overwrite) {
      process.exit(0);
      return;
    }
  }
  else if (!process.stdin.isTTY && options.overwrite && !command.yes) {
    let e = new Error(
      'Using pipe data and --overwrite, but not setting --yes flag.'
    );
    handleError(
      e,
      t,
      `There was an error with overwrite: ${chalk.red(e.toString())}`
    );
  }

  // Create tables
  try {
    t = new Tables(options);
  }
  catch (e) {
    handleError(
      e,
      t,
      `There was an error setting up Tables: ${chalk.red(e.toString())}`
    );
  }

  // Run tables
  try {
    t.start();
  }
  catch (e) {
    handleError(
      e,
      t,
      `There was an error running Tables: ${chalk.red(e.toString())}`
    );
  }
}

// Handle error
function handleError(e, t, message) {
  if (t && t.ui) {
    t.ui.done();
  }

  debug(e);
  if (message) {
    console.error(message);
  }

  process.exit(1);
}

// Run
cli();
