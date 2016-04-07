/**
 * General utility functions.
 */

// Dependencies
var _ = require("lodash");
var moment = require("moment-timezone");


// Make into a standardize name for SQL tables or columns
function toSQLName(input) {
  return !input || _.isObject(input) || _.isArray(input) || _.isNaN(input) ? undefined :
    input.toString().toLowerCase()
      .replace(/\W+/g, " ")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 64);
}

// To model name (camel case)
function toModelName(input) {
  input = toSQLName(input);

  return !input ? undefined : input.replace(/_([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}

// Standardize input, like handling empty
function standardizeInput(input) {
  if ([undefined, null].indexOf(input) !== -1) {
    input = null;
  }
  else if (_.isNaN(input)) {
    input = null;
  }
  else if (_.isString(input)) {
    input = input.trim();

    // Written empty values
    if (["unspecified", "unknown", "none", "null", "empty", ""].indexOf(input.toLowerCase()) !== -1) {
      input = null;
    }
  }

  return input;
}

// To boolean
function toBoolean(input) {
  // Written false value
  if (_.isString(input) && ["false", "f", "n", "no"].indexOf(input.toLowerCase()) !== -1) {
    return false;
  }

  return (input === null) ? null : !!input;
}

// To string
function toString(input) {
  return _.isObject(input) || _.isArray(input) ? JSON.stringify(input) :
    (input === undefined || input === null || _.isNaN(input) || input === "") ? null :
    String(input);
}

// To integer (rounds decimals)
function toInteger(input) {
  if (_.isNumber(input)) {
    input = Math.round(input);
  }
  else if (_.isString(input) && input !== "") {
    input = Math.round(input.replace(/[^0-9-.]/g, ""));
  }
  else if (_.isBoolean(input)) {
    input = input ? 1 : 0;
  }
  else {
    input = null;
  }

  return _.isNaN(input) || input === null ? null : input;
}

// To float
function toFloat(input) {
  if (_.isNumber(input)) {
    input = input;
  }
  else if (_.isString(input) && input !== "") {
    input = parseFloat(input.replace(/[^0-9-.]/g, ""));
  }
  else {
    input = null;
  }

  return _.isNaN(input) || input === null ? null : input;
}

// To date
function toDate(input, format) {
  format = format || [ "MM/DD/YYYY", "M/D/YYYY" ];
  input = moment(input, format, true);

  if (input.isValid()) {
    return input.startOf("day").toDate();
  }
  else {
    return null;
  }
}

// To datetime
function toDateTime(input, format) {
  format = format || "MM/DD/YYYY HH:mm:ss a";
  input = moment(input, format, true);

  if (input.isValid()) {
    return input.toDate();
  }
  else {
    return null;
  }
}


// Exports
module.exports = {
  toSQLName: toSQLName,
  toModelName: toModelName,
  standardizeInput: standardizeInput,
  toBoolean: toBoolean,
  toString: toString,
  toInteger: toInteger,
  toFloat: toFloat,
  toDate: toDate,
  toDateTime: toDateTime
};
