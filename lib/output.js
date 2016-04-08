/**
 * Module to help with making nice command line ouput.
 */


// Dependencies
var chalk = require("chalk");
var _ = require("lodash");

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
var bullet = chalk.magenta(" • ");

// Create class for output, this is mostly used so that turning
// off and on output can be managed more easily
var Output = function(on, options) {
  options = options || {};
  this.on = _.isUndefined(on) ? true : !!on;
  this.useBullet = _.isUndefined(options.useBullet) ?  true : !!options.useBullet;

  // Use stderr since this is all just nice info to have and not data
  // http://www.jstorimer.com/blogs/workingwithcode/7766119-when-to-use-stderr-instead-of-stdout
  this.output = options.output || process.stderr;

  // Other properties
  this.bullet = bullet;
  this.cc = cc;
  this.chalk = chalk;
  this.progressOptionsComplete = cc.bgo + " " + cc.bgc;
  this.progressOptionsIncomplete = cc.bwo + " " + cc.bwc;
  this.progressBarFormat = (this.useBullet ? bullet : "") + "[:bar] :percent | :elapseds elapsed | ~:etas left";
  this.spinnerFormat = (this.useBullet ? bullet : "") + "%s";
};

// General console logger
Output.prototype.log = function(o, forced) {
  if (this.on || (_.isBoolean(forced) && forced)) {
    this.output.write(o + "\n");
  }
};

// Bulleted item
Output.prototype.item = function(o, forced) {
  this.log((this.useBullet ? bullet : "") + o, forced);
};

// Note
Output.prototype.note = function(o) {
  this.item(chalk.italic.gray(o));
};

// Error.  These get forced.
Output.prototype.error = function(o) {
  this.item(chalk.red("ERROR: " + o), true);
};

// Warning
Output.prototype.warn = function(o) {
  this.item(chalk.yellow("WARNING: " + o));
};

// Heading
Output.prototype.heading = function(o) {
  var underline = "";
  _.each(o, function() {
    underline += "▀";
  });

  this.log("");
  this.log(o);
  this.log(chalk.magenta(underline));
};

// Title
Output.prototype.title = function(o) {
  var underline = "";
  _.each(o, function() {
    underline += "▇";
  });

  this.log("");
  this.log(o.toUpperCase());
  this.log(chalk.yellow(underline));
};


// Export wrapper that allows to turn on or off output
module.exports = function(on, useBullet) {
  return new Output(on, useBullet);
};
