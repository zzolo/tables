/**
 * Guess model from column data
 */

// Dependencies
var _ = require("lodash");
var Sequelize = require("sequelize");


// Guess model from data.  Takes in object (or arrary) of arrays of values.
// For instance: { columnA: [1, 2, 3], columnB: ["a", "b"] }
//
// And should return a model object
// {
//   fields: [
//     {
//       name: "columnA",
//       input: "A",
//       // sequelize options
//       // http://sequelize.readthedocs.org/en/latest/docs/models-definition/
//     }
//   ],
//   indexes [
//     { // sequelize options }
//   ]
// }
function guessModel(columns) {
  var model = { fields: [], indexes: [] };

  // Since we are guessing, we should make a primary key
  model.fields.push({ name: "primKey", type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true });

  // Go through each column
  _.each(columns, function(data, inputColumn) {
    var field = {};

    // Make names
    field.input = inputColumn;
    field.name = inputColumn.length === 1 ?
      "column_" + inputColumn.toLowerCase() : toColumn(inputColumn);

    // Guess type
    field.type = dataToType(data, inputColumn);
    model.fields.push(field);
  });

  return model;
}

// Data to type
function dataToType(data, name) {
  var knownID = /(^|\s)(zip|phone)(\s|$)/i;

  // If data is not a simple type, then just use text
  if (_.isArray(data[0]) || _.isObject(data[0])) {
    return Sequelize.TEXT;
  }

  // Otherise go through each value and see what is found
  data = _.map(data, function(d) {
    d = standardize(d);

    return {
      value: d,
      length: d.length,
      kind: pickle(d)
    };
  });

  // Filter out any empty values
  data = _.filter(data, "length");
  var counted = _.countBy(data, "kind");
  var top = _.sortBy(_.map(counted, function(d, di) {
    return { kind: di, count: d };
  }), "count").reverse()[0];
  var maxLength = _.maxBy(data, "length");
  maxLength = maxLength ? maxLength.length : maxLength;
  var kind;

  // If none, then just assume string
  if (_.size(data) === 0) {
    return Sequelize.STRING;
  }
  // If there is only one kind, stick with that
  else if (_.size(counted) === 1) {
    kind = top.kind;
  }
  // If there is an integer and a float, use float
  else if (counted.INTGER && counted.FLOAT) {
    kind = "FLOAT";
  }
  else {
    kind = top.kind;
  }

  // Add length if needed
  if (kind === "STRING") {
    return Sequelize.STRING(Math.floor(maxLength * 1.5));
  }
  // Known not numbers
  else if ((kind === "INTEGER" || kind === "FLOAT") && knownID.test(name)) {
    return Sequelize.STRING(Math.floor(maxLength * 1.5));
  }
  else {
    return Sequelize[kind];
  }
}

// Convert value a bit
function standardize(value) {
  if (_.isString(value)) {
    value = value.trim().toLowerCase();

    if (["unspecified", "unknown", "none", "null", "empty"].indexOf(value) !== -1) {
      value = "";
    }
  }

  return value;
}

// Find type.  Should return base Sequelize type
function pickle(value) {
  // Tests
  var floatTest = /^(-|)[\d,]+.\d+$/g;
  var intTest = /^\d+$/g;
  var booleanTest = /^(true|false)$/g;
  var dateTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/g;
  var datetimeTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{1,2}(:\d{1,2}|)(\s+|)(am|pm|)$/gi;

  // Test values
  if (_.isInteger(value) || intTest.test(value)) {
    return "INTEGER";
  }
  if ((_.isFinite(value) && !_.isInteger(value)) || floatTest.test(value)) {
    return "FLOAT";
  }
  if (_.isBoolean(value) || booleanTest.test(value)) {
    return "BOOLEAN";
  }
  if (dateTest.test(value)) {
    return "DATEONLY";
  }
  if (datetimeTest.test(value)) {
    return "DATE";
  }

  return "STRING";
}

// To column
function toColumn(column) {
  return column.trim().toLowerCase()
    .replace(/\W+/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .substring(0, 64);
}


// Export
module.exports = guessModel;
