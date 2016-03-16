/**
 * Main class for Stream to SQL.
 */

// Dependencies
var fs = require("fs");
var path = require("path");
var url = require("url");
var stream = require("stream");
var es = require("event-stream");

var _ = require("lodash");
var ProgressBar = require("progress");
var Spinner = require("cli-spinner").Spinner;
var Sequelize = require("sequelize");
var queue = require("d3-queue").queue;
var unpipe = require("unpipe");
var merge = require("merge2");

var output = require("./output.js");
var utils = require("./utils.js");
var dbUtils = require("./db.js");
var columnsToModel = require("./columns-to-model.js");
var autoParser = require("./auto-parser.js");


// Constructor
function Tables(options) {
  // Allow the use of .env files
  require("dotenv").config({
    silent: true
  });

  // Make output object
  this.output = output(options.output === undefined ? false : options.output);

  // Use defaults
  options = _.defaultsDeep(options, {
    progress: this.output.progressBarFormat,
    progressOptions: {
      complete: this.output.progressOptionsComplete,
      incomplete: this.output.progressOptionsIncomplete,
      width: 50
    },
    dbOptions: {
      // By default, logs everything to console.log
      logging: false,
      define: {
        timestamps: false
      }
    },
    batchSize: 1000,
    dataPath: this.defaultDataPath()
  });

  // Guess type and options
  if (!options.inputType && options.input) {
    if (options.input.indexOf(".csv") !== -1) {
      options.inputType = "csv";
      options.inputOptions = options.inputOptions || {
        headers: true,
        ignoreEmpty: true
      };
    }
    else if (options.input.indexOf(".json") !== -1) {
      options.inputType = "json";
      options.inputOptions = options.inputOptions || "*";
    }
  }
  else if (!options.inputType) {
    options.inputType = "csv";
    options.inputOptions = options.inputOptions || {
      headers: true,
      ignoreEmpty: true
    };
  }

  // Use input for id if not provided
  options.id = options.id || options.input || undefined;

  // Match up any environment variables
  options.db = options.db ? options.db : process.env.TABLES_DB_URI;

  // Check some options
  if (!options.input && process.stdin.isTTY) {
    throw new Error("If not piping in data, options.input option is required.");
  }
  if (options.input && !fs.existsSync(options.input)) {
    throw new Error("options.input file given but does not exist.");
  }
  if (["csv", "json"].indexOf(options.inputType) === -1) {
    throw new Error("options.inputType not supported.");
  }

  // Check for stdin
  if (!options.input) {
    options.stdin = true;
  }

  // Attach options
  this.options = options;

  // Get any data from data file
  this.data = {};
  if (this.options.id && this.options.dataPath && fs.existsSync(this.options.dataPath)) {
    this.data = JSON.parse(fs.readFileSync(this.options.dataPath, "utf-8"));
  }

  // Get info from input
  this.inputStats = this.inputStats || this.fileStat(this.options.input);

  // Title
  this.output.title("Tables");

  // Start if models defined, otherwise we need to guess
  if (options.models) {
    this.start();
  }
  else {
    this.guessModel();
  }
}

// Start (all options ready)
Tables.prototype.start = function() {
  // Connect to database
  this.output.heading("Database");
  this.output.item("Connecting to DB");
  this.dbConnect(_.bind(function() {
    this.output.item("Connected to DB");
    this.parse();
  }, this));
};

// Main parsing method
Tables.prototype.parse = function() {
  var thisTables = this;
  var bar = this.bar();
  var parsedCount = 0;
  var parsedByteCount = 0;
  var info = (this.data && this.data[this.options.id]) ? this.data[this.options.id] : undefined;
  var tickStart = 0;
  var tickStarted = false;
  var options = {};
  var persistentOptions;
  var b;
  var s;

  // Output head
  this.output.heading("Streaming");

  // Reset batch
  this.batch = [];

  // Create stream
  if (!this.options.stdin) {
    this.output.item("Streaming: " + this.options.input);

    // Check if we should start from middle.  Only works for CSV for now, as JSON
    // requires a begninng string.  TODO: get JSON resume to work
    if (info && info.current && info.current < info.total && this.options.inputType === "csv") {
      options.start = parsedByteCount = info.current;
      options.end = info.total;
      this.options.inputOptions = _.defaultsDeep(info.inputOptions, this.options.inputOptions);
      tickStart = info.current;
    }

    // Create stream
    s = fs.createReadStream(this.options.input, options);
  }
  else {
    this.output.item("Streaming stdin");
    b = new stream.PassThrough();
    b.end(Buffer.concat(this.guessBuffers));
    s = merge(b, thisTables.guessStream);
  }

  // On streaming data, update bar and counts
  s.on("data", function(data) {
    parsedByteCount = parsedByteCount + data.length;
    bar.tick((!tickStarted) ? tickStart + data.length : data.length);
    tickStarted = true;
  });

  // On end, update output
  s.on("end", function() {
    if (!bar.complete) {
      bar.terminate();
    }

    thisTables.output.item("Streaming done");
  });

  // Handle error
  s.on("error", function(error) {
    throw new Error(error);
  });

  // Add main parser
  s.pipe(this.inputParser())
    .on("data", function(data) {
      // To resume a stream, we need to save the headers
      persistentOptions = persistentOptions ||
        ((thisTables.options.inputType === "csv") ? { headers: _.keys(data) } : {});

      // Parse with autoparser
      var parsed = autoParser(data, thisTables.options.models);

      // Insert into database (as needed)
      thisTables.insertBatch(parsed, s, this, parsedByteCount, persistentOptions, false);

      // Track rows
      parsedCount++;
      if (bar.rows) {
        bar.rows(parsedCount);
      }
    })
    .on("end", function() {
      thisTables.insertBatch(null, s, this, parsedByteCount, persistentOptions, true);

      // Complete bar
      if (!bar.complete) {
        bar.terminate();
      }
      thisTables.output.item("Parsing done \n");
    })
    .on("error", function(error) {
      throw new Error(error);
    });
};

// Handle batch.  Split up batches into models
Tables.prototype.insertBatch = function(data, streamProcess, parseProcess, bytes, persistentOptions, force, done) {
  var q;
  var split = {};

  // Add to array
  if (data) {
    this.batch.push(data);
  }

  // First check if we should
  if (force || this.batch.length >= this.options.batchSize) {
    q = queue(1);
    parseProcess.pause();
    streamProcess.pause();

    // Split up models
    _.each(this.batch, function(b) {
      _.each(b, function(row, modelName) {
        split[modelName] = split[modelName] || [];
        split[modelName].push(row);
      });
    });

    // Queue up each model
    _.each(split, _.bind(function(b, modelName) {
      q.defer(dbUtils.bulkUpsert, this.db, this.models[modelName], b);
    }, this));

    // When done
    q.awaitAll(_.bind(function(error) {
      if (error) {
        throw new Error(error);
      }

      this.batch = [];
      this.saveData(bytes, persistentOptions);
      streamProcess.resume();
      parseProcess.resume();
    }, this));
  }
};

// Guess model
Tables.prototype.guessModel = function() {
  var thisTables = this;
  var guessLimit = 1000;
  var guessCount = 0;
  var columns = {};
  var bar = this.bar();
  var exited = false;
  var tableName = utils.toSQLName(this.options.tableName) ||
    this.guessTableName(this.options.input) || "tables_import";
  var guess;

  // Title
  this.output.heading("Model guessing");
  this.output.item("No models options provided, guessing data structure and types from first " + guessLimit + " rows");

  // Start stream
  if (!this.options.stdin) {
    this.output.item("Streaming: " + this.options.input);
    guess = fs.createReadStream(this.options.input);
  }
  else {
    this.output.item("Streaming stdin");
    this.guessBuffers = [];
    guess = process.stdin;
  }

  // Create functions for streams so that we can remove them if needed
  var guessData = function(data) {
    if (thisTables.options.stdin) {
      thisTables.guessBuffers.push(data);
    }

    bar.tick(data.length);
  };
  guess.on("data", guessData);

  // Add main parser
  guess.pipe(this.inputParser())
    .on("data", function(data) {
      // Add to column list
      if (guessCount < guessLimit) {
        _.each(data, function(d, di) {
          columns[di] = columns[di] || [];
          columns[di].push(d);
        });

        guessCount++;
        if (bar.rows) {
          bar.rows(guessCount);
        }
      }
      else {
        // If we are reading from stdin, we don't want to destroy
        if (thisTables.options.stdin) {
          thisTables.guessStream = guess;
          guess.pause();
          guess.removeListener("data", guessData);
          streamDone();
          unpipe(guess);
        }
        else {
          guess.destroy();
        }
      }
    });

  // Close means destroy has been called
  guess.on("close", streamDone);
  guess.on("end", streamDone);

  // When done
  function streamDone() {
    // Make sure only done once
    if (exited) {
      return;
    }
    exited = true;

    // Stop bar
    if (!bar.complete) {
      bar.terminate();
    }

    // Set options and start regular process
    thisTables.options.models = {};
    thisTables.options.models[tableName] = columnsToModel(columns, thisTables.options.key);
    thisTables.output.item("Done guessing");
    thisTables.start();
  }
};

// Guess table name from input`
Tables.prototype.guessTableName = function(input) {
  var parts;

  // We may not have an input file name to go from
  if (!input) {
    return "tables_import";
  }

  parts = input.split("/");
  return utils.toSQLName(parts[parts.length - 1].replace(".csv", "").replace(".json", ""));
};

// Get info about input file
Tables.prototype.fileStat = function(file) {
  return file ? fs.statSync(file) : {};
};

// MAke progress bar based on input
Tables.prototype.bar = function() {
  var thisTables = this;
  var spinner;
  this.inputStats = this.inputStats || this.fileStat(this.options.input);

  // Only output if configured
  if (this.options.output) {
    if (this.inputStats.size) {
      return new ProgressBar(this.options.progress, _.extend(this.options.progressOptions, {
        total: this.inputStats.size
      }));
    }
    else {
      spinner = new Spinner(this.output.spinnerFormat);
      spinner.tick = function() { return; };
      spinner.rows = function(rows) {
        if (rows && rows % this.options.batchSize === 0) {
          spinner.stop(true);
          spinner.setSpinnerTitle(thisTables.output.spinnerFormat + " " + rows + " rows");
          spinner.start();
        }
      };
      spinner.terminate = function() {
        spinner.stop(true);
      };
      spinner.complete = false;
      spinner.start();
      return spinner;
    }
  }
  else {
    return {
      tick: function() { return; },
      terminate: function() { return; },
      complete: true
    };
  }
};

// Make input parser
Tables.prototype.inputParser = function() {
  var JSONStream;
  var csvParser;

  // JSON parser
  // https://github.com/dominictarr/JSONStream
  if (this.options.inputType === "json") {
    this.output.item("Using JSON parser");
    JSONStream = require("JSONStream");
    return JSONStream.parse(this.options.inputOptions);
  }
  // CSV parser
  // http://csv.adaltas.com/parse/
  else if (this.options.inputType === "csv") {
    this.output.item("Using CSV parser");
    csvParser = require("fast-csv");
    return csvParser(this.options.inputOptions);
  }
};

// Make sequelize connection
Tables.prototype.dbConnect = function(done) {
  var dbOptions = {
    pool: {
      maxIdleTime: 10000
    }
  };

  // If no connection is provide, use the file name and sqlite
  if (!this.options.db) {
    this.options.db = this.options.input ? "sqlite://" + this.options.input
      .replace(".csv", "")
      .replace(".json", "") + ".sql" :
      "sqlite://tables-import.sql";
  }

  // URI possibilities
  // mariadb://root:@localhost:3306/db_store
  // mysql://root:thing@localhost:3306/db_store
  // pgsql://root:thing@localhost/db_store
  // sqlite://path/to/file.sql
  this.dbConnectionConfg = url.parse(this.options.db);

  // Make options based on protocol
  if (this.dbConnectionConfg.protocol.toLowerCase().indexOf("mysql") === 0 ||
    this.dbConnectionConfg.protocol.toLowerCase().indexOf("mariadb") === 0) {
    dbOptions.dialectOptions = {
      multipleStatements: true
    };
  }
  else if (this.dbConnectionConfg.protocol.toLowerCase().indexOf("pgsql") === 0) {
    dbOptions.dialectOptions = {
      multipleStatements: true
    };
  }
  else if (this.dbConnectionConfg.protocol.toLowerCase().indexOf("sqlite") === 0) {
    dbOptions.storage = this.dbConnectionConfg.hostname +
      (this.dbConnectionConfg.path ? this.dbConnectionConfg.path : "");
  }

  // Allow for people to override options
  dbOptions = _.defaultsDeep(this.options.dbOptions || {}, dbOptions);

  // Connect
  this.db = new Sequelize(this.options.db, dbOptions);

  // Set up models
  _.each(this.options.models, _.bind(function(model, tableName) {
    model.tableName = model.tableName || tableName;
    model.modelName = model.modelName || utils.toModelName(tableName);
    this.models = this.models || {};
    this.models[model.modelName] = this.db.define(tableName, model.fields, _.extend({
      underscored: true,
      freezeTableName: true,
      tableName: tableName
    }, model.options));
  }, this));

  // Sync (create tables)
  this.db.sync({ force: false }).then(done);
};

// Make default data path
Tables.prototype.defaultDataPath = function() {
  return path.join(process.env[(process.platform === "win32") ? "USERPROFILE" : "HOME"], ".tables-data");
};

// Save data
Tables.prototype.saveData = function(bytes, options) {
  this.inputStats = this.inputStats || this.fileStat(this.options.input);

  if (this.options.id && this.options.dataPath) {
    // Update data info
    this.data[this.options.id] = {
      current: bytes,
      total: this.inputStats.size,
      inputOptions: options
    };

    // Save file
    fs.writeFileSync(this.options.dataPath, JSON.stringify(this.data));
  }
};


// Export
module.exports = Tables;
