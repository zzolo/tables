/**
 * Main class for Stream to SQL.
 */

// Dependencies
var fs = require("fs");
var _ = require("lodash");
var ProgressBar = require("progress");
var chalk = require("chalk");

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
  // Use defaults
  options = _.defaultsDeep(options, {
    progress: bullet + "Processing [:bar] :percent | :elapseds elapsed | ~:etas left",
    progressOptions: {
      complete: cc.bgo + " " + cc.bgc,
      incomplete: cc.bwo + " " + cc.bwc,
      width: 50
    }
  });

  // Check some options
  if (!options.input) {
    throw new Error("Input option is required.");
  }
  if (!fs.existsSync(options.input)) {
    throw new Error("Input file does not exist.");
  }

  // Attach options
  this.options = options;

  // Make some properties
  this.inputStats = this.fileStat(options.input);
  this.bar = new ProgressBar(options.progress, _.extend(options.progressOptions, {
    total: this.inputStats.size
  }));

  // Start
  this.start();
}

// Methods
StreamSQL.prototype.start = function() {
  var thisStreamSQL = this;

  // Stream to SQL
  this.talk("Stream to SQL");
  this.talk("Streaming: " + this.options.input);

  // Create stream
  this.s = fs.createReadStream(this.options.input);

  // On data, update bar
  this.s.on("data", function(data) {
    thisStreamSQL.bar.tick(data.length);
  });
};

// Get info about input file
StreamSQL.prototype.fileStat = function(file) {
  return fs.statSync(file);
};

// Output
StreamSQL.prototype.talk = function(words) {
  console.log(bullet + words);
};


// Export
module.exports = StreamSQL;
