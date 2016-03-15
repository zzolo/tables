/**
 * Module to help with making nice command line ouput.
 */


// Dependencies
var chalk = require("chalk");
var _ = require("lodash");

// Global to have output on or off
var output = false;

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

// General console logger
function log(o) {
  if (output) {
    console.log(o);
  }
}

// Bulleted item
function item(o, useBullet) {
  log((useBullet || _.isUndefined(useBullet) ? bullet : "") + o);
}

// Item
function note(o, useBullet) {
  item(chalk.italic.gray(o), useBullet);
}

// Error
function error(o, useBullet) {
  item(chalk.red(o), useBullet);
}

// Heading
function heading(o) {
  log("");
  log(o);
  log(chalk.magenta("======="));
}

// Title
function title(o) {
  log("");
  log(o);
}


// Export wrapper that allows to turn on or off output
module.exports = function(localOutput) {
  output = !!localOutput;

  return {
    progressOptionsComplete: cc.bgo + " " + cc.bgc,
    progressOptionsIncomplete: cc.bwo + " " + cc.bwc,
    progressBarFormat: bullet + "[:bar] :percent | :elapseds elapsed | ~:etas left",
    error: error,
    note: note,
    item: item,
    heading: heading,
    title: title,
    log: log
  };
};
