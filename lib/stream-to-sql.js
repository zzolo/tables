/**
 * Main class for Stream to SQL.
 */

// Dependencies
var fs = require("fs");
var url = require("url");
var es = require("event-stream");
var _ = require("lodash");
var ProgressBar = require("progress");
var chalk = require("chalk");
var Sequelize = require("sequelize");
var columnsToModel = require("./columns-to-model.js");

// Some common colors and styling
var cc = {
  ro: chalk.styles.red.open,
  rc: chalk.styles.red.close,
  go: chalk.styles.green.open,
  gc: chalk.styles.green.close,
  bgo: chalk.styles.bgGreen.open,
  bgc: chalk.styles.bgGreen.close,
  bwo: chalk.styles.bgWhite.open,
  bwc: chalk.styles.bgWhite.close,
};
var bullet = chalk.magenta(" * ");


// Constructor
function StreamSQL(options) {
  // Allow the use of .env files
  require("dotenv").config({
    silent: true
  });

  // Use defaults
  options = _.defaultsDeep(options, {
    progress: bullet + "Processing [:bar] :percent | :elapseds elapsed | ~:etas left",
    progressOptions: {
      complete: cc.bgo + " " + cc.bgc,
      incomplete: cc.bwo + " " + cc.bwc,
      width: 50
    },
    inputType: "csv",
    inputOptions: {
      headers: true,
      ignoreEmpty: true
    },
    dbOptions: {
      define: {
        timestamps: false
      }
    }
  });

  // Guess type and options
  if (!options.inputType && options.input) {
    if (options.input.indexOf(".csv")) {
      options.inputType = "csv";
      options.inputOptions = options.inputOptions || {
        headers: true,
        ignoreEmpty: true
      };
    }
    else if (options.input.indexOf(".jdon")) {
      options.inputType = "json";
      options.inputOptions = options.inputOptions || "*";
    }
  }

  // Match up any environment variables
  options.db = options.db ? options.db : process.env.STREAM_TO_SQL_DB_URI;

  // Check some options
  if (!options.input) {
    throw new Error("Input option is required.");
  }
  if (!fs.existsSync(options.input)) {
    throw new Error("Input file does not exist.");
  }
  if (!options.db) {
    throw new Error("DB connection string not provided.");
  }
  if (["csv", "json"].indexOf(options.inputType) === -1) {
    throw new Error("inputType not supported.");
  }

  // Attach options
  this.options = options;

  // Start if models defined, otherwise we need to guess
  if (options.models) {
    this.start();
  }
  else {
    this.guessModel();
  }
}

// Methods
StreamSQL.prototype.start = function() {
  var thisStreamSQL = this;
  var bar = this.bar();

  // Connect to database
  this.dbConnect();
  this.talk("Connecting to DB");

  // Create stream
  this.talk("Streaming: " + this.options.input);
  this.s = fs.createReadStream(this.options.input, "utf-8");

  // On data, update bar
  this.s.on("data", function(data) {
    bar.tick(data.length);
  });

  // On end, update output
  this.s.on("end", function() {
    thisStreamSQL.talk("Done");
  });

  // Add main parser
  this.s.pipe(this.inputParser())
    .on("data", function(data) {
      console.log("\n\n\n", data);
    });
};

// Guess model
StreamSQL.prototype.guessModel = function() {
  var thisStreamSQL = this;
  var guessLimit = 1000;
  var guessCount = 0;
  var columns = {};
  var bar = this.bar();
  var exited = false;
  var guess;

  // Start stream
  this.talk("No models options provided, guess data structure and types");
  this.talk("Streaming: " + this.options.input);
  guess = fs.createReadStream(this.options.input, "utf-8");

  // On data, update bar
  guess.on("data", function(data) {
    bar.tick(data.length);
  });

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
      }
      else {
        guess.destroy();
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

    var fields = columnsToModel(columns);
    thisStreamSQL.talk("Done");
  }
};

// Get info about input file
StreamSQL.prototype.fileStat = function(file) {
  return fs.statSync(file);
};

// MAke progress bar based on input
StreamSQL.prototype.bar = function() {
  this.inputStats = this.inputStats || this.fileStat(this.options.input);
  return new ProgressBar(this.options.progress, _.extend(this.options.progressOptions, {
    total: this.inputStats.size
  }));
};

// Output
StreamSQL.prototype.talk = function(words, useBullet) {
  console.log((useBullet || _.isUndefined(useBullet) ? bullet : "") + words);
};

// Make input parser
StreamSQL.prototype.inputParser = function() {
  var JSONStream;
  var csvParser;

  // JSON parser
  // https://github.com/dominictarr/JSONStream
  if (this.options.inputType === "json") {
    this.talk("Using JSON parser");
    JSONStream = require("JSONStream");
    return JSONStream.parse(this.options.inputOptions);
  }
  // CSV parser
  // http://csv.adaltas.com/parse/
  else if (this.options.inputType === "csv") {
    this.talk("Using CSV parser");
    csvParser = require("fast-csv");
    return csvParser(this.options.inputOptions);
  }
};

// Make sequelize connection
StreamSQL.prototype.dbConnect = function() {
  var dbOptions = {
    pool: {
      maxIdleTime: 10000
    }
  };

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
    dbOptions.storage = this.dbConnectionConfg.hostname + this.dbConnectionConfg.path;
  }

  // Allow for people to override options
  dbOptions = _.defaultsDeep(this.options.dbOptions || {}, dbOptions);

  // Connect
  this.db = new Sequelize(this.options.db, dbOptions);
};


// Export
module.exports = StreamSQL;
