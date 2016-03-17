/**
 * Function to handle auto parsing from data to model
 */

// Dependencies
var _ = require("lodash");
var Sequelize = require("sequelize");
var utils = require("./utils.js");


// Main function. Takes a row of incoming data and the models definition
function autoParse(data, models, options) {
  options = options || {};
  var parsed = {};

  // Go through each data point
  _.each(data, function(value, field) {
    var d = findField(field, models);

    // Find field in
    if (d) {
      parsed[d.modelName] = parsed[d.modelName] || {};
      parsed[d.modelName][d.field.name] = parse(value, d.field, options);
    }
  });

  return parsed;
}

// Parse value based on field definition
function parse(value, field, options) {
  options = options || {};
  var parsed = utils.standardizeInput(value);

  // Integer
  if (field.type.key === "BOOLEAN") {
    parsed = utils.toBoolean(parsed);
  }
  else if (field.type.key === "INTEGER") {
    parsed = utils.toInteger(parsed);
  }
  else if (field.type.key === "FLOAT") {
    parsed = utils.toFloat(parsed);
  }
  else if (field.type.key === "DATEONLY") {
    parsed = utils.toDate(parsed, options.dateFormat);
  }
  else if (field.type.key === "DATE") {
    parsed = utils.toDateTime(parsed, options.datetimeFormat);
  }
  else if (field.type.key === "STRING") {
    parsed = utils.toString(parsed);
  }

  return parsed;
}

// Find definition in models
function findField(field, models) {
  var found = false;

  _.each(models, function(model) {
    // Go through fields
    _.each(model.fields, function(f) {
      if (f.input === field) {
        found = {
          modelName: model.modelName,
          field: f
        };
      }
    });
  });

  return found;
}


// Export
module.exports = autoParse;
