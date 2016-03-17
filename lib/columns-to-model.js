/**
 * Guess model from column data
 */

// Dependencies
var _ = require("lodash");
var moment = require("moment-timezone");
var Sequelize = require("sequelize");
var utils = require("./utils.js");


// Guess model from data.  Takes in object (or arrary) of arrays of values.
// For instance: { columnA: [1, 2, 3], columnB: ["a", "b"] }
//
// And should return a model object
// {
//   fields: {
//     columnA: {
//       name: "columnA",
//       input: "A",
//       // sequelize options
//       // http://sequelize.readthedocs.org/en/latest/docs/models-definition/
//     }
//   },
//   // Options for Sequelize models
//   options: {
//     indexes [
//       { // sequelize options }
//     ]
//   }
// }
function guessModel(columns, options) {
  options = options || {};
  var model = { fields: {}, options: { indexes: [] }};

  // Since we are guessing, we should make a primary key
  model.fields.primKey = { name: "primKey", type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true };

  // Go through each column
  _.each(columns, function(data, inputColumn) {
    var field = {};

    // Make names
    field.input = inputColumn;
    field.name = inputColumn.length === 1 ?
      "column_" + inputColumn.toLowerCase() : utils.toSQLName(inputColumn);

    // Guess type
    field.type = dataToType(data, inputColumn, options);
    model.fields[field.name] = field;

    // Make indexes based on column name
    if (shouldIndex(field.name)) {
      model.options.indexes.push({ fields: [ field.name ]});
    }
  });

  // Make key
  if (options.key && options.tableName) {
    model.options.indexes.push({
      fields: _.map(options.key.split(","), function(c) {
        return utils.toSQLName(c);
      }),
      name: utils.toSQLName(options.tableName + options.key),
      unique: true
    });
  }

  return model;
}

// Data to type
function dataToType(data, name, options) {
  options = options || {};
  var knownID = /(^|\s|_)(zip|phone|id)(_|\s|$)/i;

  // If data is not a simple type, then just use text
  if (_.isArray(data[0]) || _.isObject(data[0])) {
    return Sequelize.TEXT;
  }

  // Otherise go through each value and see what is found
  data = _.map(data, function(d) {
    d = standardize(d);

    return {
      value: d,
      length: (d && d.toString) ? d.toString().length : null,
      kind: pickle(d, options)
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

  // Check for long strings
  if (kind === "STRING" && maxLength * 2 < 512) {
    return new Sequelize.STRING(Math.floor(maxLength * 2));
  }
  // Otherwise add length
  else if (kind === "STRING" && maxLength * 2 >= 512) {
    return Sequelize.TEXT;
  }
  // Known not numbers
  else if ((kind === "INTEGER" || kind === "FLOAT") && knownID.test(name)) {
    return new Sequelize.STRING(Math.floor(maxLength * 2));
  }
  // Check for long integers
  else if (kind === "INTEGER" && maxLength > 8) {
    return Sequelize.BIGINT;
  }
  else {
    return Sequelize[kind];
  }
}

// Convert value a bit, but keep as string if needed
function standardize(value) {
  var isString = _.isString(value);
  value = utils.standardizeInput(value);
  return (isString && value === null) ? "" : value;
}

// Determine if should index based on name
function shouldIndex(name) {
  var nameTest = /(^|_|-|\s)(id|name|key|amount|amt)($|_|-|\s)/g;
  return nameTest.test(name);
}

// Find type.  Should return base Sequelize type
function pickle(value, options) {
  options = options || {};
  // Tests
  var floatTest = /^(-|)[\d,]+.\d+$/g;
  var intTest = /^\d+$/g;
  var booleanTest = /^(true|false)$/g;
  var dateTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/g;
  var datetimeTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{1,2}(:\d{1,2}|)(\s+|)(am|pm|)$/gi;

  // Test values
  if ((options.datetimeFormat && moment(value, options.datetimeFormat, true).isValid()) || datetimeTest.test(value)) {
    return "DATE";
  }
  if ((options.dateFormat && moment(value, options.dateFormat, true).isValid()) || dateTest.test(value)) {
    return "DATEONLY";
  }
  if (_.isInteger(value) || intTest.test(value)) {
    return "INTEGER";
  }
  if ((_.isFinite(value) && !_.isInteger(value)) || floatTest.test(value)) {
    return "FLOAT";
  }
  if (_.isBoolean(value) || booleanTest.test(value)) {
    return "BOOLEAN";
  }

  return "STRING";
}

// Export
module.exports = guessModel;
