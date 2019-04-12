/**
 * General utility functions.
 */

// Dependencies
const _ = require('lodash');
const moment = require('moment-timezone');

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
    if (input.match(/^(\s*|unspecified|unknown|null|none|empty|n\/a)$/i)) {
      input = null;
    }
  }

  return input;
}

// To boolean
function toBoolean(input) {
  // Written false value
  if (
    _.isString(input) &&
    ['false', 'f', 'n', 'no'].indexOf(input.toLowerCase()) !== -1
  ) {
    return false;
  }

  return input === null ? null : !!input;
}

// To string
function toString(input) {
  return _.isObject(input) || _.isArray(input)
    ? JSON.stringify(input)
    : input === undefined || input === null || _.isNaN(input) || input === ''
      ? null
      : String(input);
}

// To integer (rounds decimals)
function toInteger(input) {
  if (_.isNumber(input)) {
    input = Math.round(input);
  }
  else if (_.isString(input) && input !== '') {
    input = Math.round(input.replace(/[^0-9-.]/g, ''));
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
  if (_.isString(input) && input !== '') {
    input = parseFloat(input.replace(/[^0-9-.]/g, ''));
  }
  else if (!_.isNumber(input)) {
    input = null;
  }

  return _.isNaN(input) || input === null ? null : input;
}

// To date
function toDate(input, format) {
  format = format || ['MM/DD/YYYY', 'M/D/YYYY'];
  let inputDate = moment(input, format, true);

  if (_.isString(input) && input === '') {
    return null;
  }
  else if (inputDate.isValid()) {
    return inputDate.startOf('day').toDate();
  }
  else {
    return null;
  }
}

// To datetime
function toDateTime(input, format) {
  format = format || 'MM/DD/YYYY HH:mm:ss a';
  let inputDate = moment(input, format, true);

  if (_.isString(input) && input === '') {
    return null;
  }
  else if (inputDate.isValid()) {
    return inputDate.toDate();
  }
  else {
    return null;
  }
}

// Exports
module.exports = {
  standardizeInput,
  toBoolean,
  toString,
  toInteger,
  toFloat,
  toDate,
  toDateTime
};
