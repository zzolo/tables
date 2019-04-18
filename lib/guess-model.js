/**
 * Guess model from column data
 */

// Dependencies
const _ = require('lodash');
const moment = require('moment-timezone');
const Sequelize = require('sequelize');
const utils = require('./utils-data');
const dbUtils = require('./utils-db');

// Guess model from data from rows of data
//
// And should return a model object
// {
//   fields: {
//     columnA: {
//       tablesInputColumn: "Column From CSV",
//       field: "db_column_name",
//       type: Sequelize.INTEGER
//       // sequelize options
//       // http://docs.sequelizejs.com/manual/models-definition.html
//     }
//   },
//   // Options for Sequelize models
//   options: {
//     // http://docs.sequelizejs.com/manual/models-definition.html
//     indexes [
//       { fields: ["db_column_name"] }
//     ]
//   }
// }
function guessModel(data, tablesOptions = {}, sequlizeInstance) {
  let fields = {};
  let modelName = tablesOptions.tableName
    ? _.camelCase(tablesOptions.tableName)
    : 'tablesImport';

  let modelOptions = {
    sequelize: sequlizeInstance,
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    tableName: dbUtils.sqlName(modelName)
  };

  // Go through each column
  _.each(data[0], (v, columnName) => {
    let fieldName = _.camelCase(columnName);
    let sqlName = dbUtils.sqlName(columnName);
    let columnData = _.map(data, columnName);
    let field = {};

    // Set tables-specific property
    field.tablesInputColumn = columnName;

    // set specific SQL column name
    field.field = sqlName;

    // Guess type
    field.type = dataToType(columnData, columnName, tablesOptions);

    // Allow null by default
    field.allowNull = true;

    // Attach to fields
    fields[fieldName] = field;

    // Make indexes based on column name
    if (shouldIndex(columnName, tablesOptions)) {
      // Index needs to use SQL name, not Sequelize name
      modelOptions.indexes.push({ fields: [sqlName] });
    }
  });

  // If key is provided, use as primary key
  if (tablesOptions.key) {
    let keyFields = _.isArray(tablesOptions.key)
      ? tablesOptions.key
      : [tablesOptions.key];
    keyFields = _.map(keyFields, _.camelCase);

    keyFields.forEach(f => {
      fields[f].primaryKey = true;
      fields[f].allowNull = false;
    });
  }
  else {
    // Add a primary key
    fields.tablesPrimaryKey = {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    };
  }

  class TablesAutoModel extends Sequelize.Model {}
  TablesAutoModel.init(fields, modelOptions);
  // Attached so that we can reference it later
  TablesAutoModel.modelName = modelName;
  return TablesAutoModel;
}

// Data to type
function dataToType(data, name, tablesOptions = {}) {
  let knownID = /(^|\s|_|-)(zip|phone|id)(_|\s|-|$)/i;

  // Otherise go through each value and see what is found
  data = _.map(data, function(d) {
    d = standardize(d);

    return {
      value: d,
      length: d && d.toString ? d.toString().length : null,
      kind: pickle(d, tablesOptions)
    };
  });

  // Filter out any empty values
  data = _.filter(data, 'length');
  let counted = _.countBy(data, 'kind');
  let top = _.sortBy(
    _.map(counted, function(d, di) {
      return { kind: di, count: d };
    }),
    'count'
  ).reverse()[0];
  let maxLength = _.maxBy(data, d => (d && d.length ? d.length : 0));
  maxLength = maxLength ? maxLength.length : maxLength;
  let kind;

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
    kind = 'FLOAT';
  }
  else {
    kind = top.kind;
  }

  // Check for long strings.  Max string (in MySQL) is 255
  if (kind === 'STRING' && maxLength * 2 < 240) {
    return new Sequelize.STRING(Math.max(2, maxLength * 2));
  }
  // Otherwise add length
  else if (kind === 'STRING') {
    return Sequelize.TEXT;
  }
  // Known not numbers
  else if ((kind === 'INTEGER' || kind === 'FLOAT') && knownID.test(name)) {
    return new Sequelize.STRING(Math.floor(maxLength * 2));
  }
  // Check for long integers
  else if (kind === 'INTEGER' && maxLength > 8) {
    return Sequelize.BIGINT;
  }
  else {
    return Sequelize[kind];
  }
}

// Convert value a bit, but keep as string if needed
function standardize(value) {
  let isString = _.isString(value);
  value = utils.standardizeInput(value);
  return isString && value === null ? '' : value;
}

// Determine if should index based on name
function shouldIndex(name, options = {}) {
  let c = options.fieldsToIndex;
  let nameTest = _.isRegExp(c)
    ? c
    : _.isString(c)
      ? new RegExp(c, 'i')
      : /(^|_)(id|name|key|amount|amt)($|_)/g;

  return nameTest.test(_.snakeCase(name));
}

// Find type.  Should return base Sequelize type
function pickle(value, options = {}) {
  // Tests
  let floatTest = /^(-|)[\d,]+.\d+$/g;
  let intTest = /^\d+$/g;
  let booleanTest = /^(true|false|y|n|yes|no)$/gi;
  let dateTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/g;
  let datetimeTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{1,2}(:\d{1,2}|)(\s+|)(am|pm|)$/gi;

  // Test values
  if (_.isArray(value) || _.isPlainObject(value)) {
    // TODO: Maybe handle JSON data type
    return 'TEXT';
  }
  else if (
    (options.datetimeFormat &&
      moment(value, options.datetimeFormat, true).isValid()) ||
    datetimeTest.test(value)
  ) {
    return 'DATE';
  }
  if (
    (options.dateFormat && moment(value, options.dateFormat, true).isValid()) ||
    dateTest.test(value)
  ) {
    return 'DATEONLY';
  }
  if (_.isInteger(value) || intTest.test(value)) {
    return 'INTEGER';
  }
  if ((_.isFinite(value) && !_.isInteger(value)) || floatTest.test(value)) {
    return 'FLOAT';
  }
  if (_.isBoolean(value) || booleanTest.test(value)) {
    return 'BOOLEAN';
  }

  return 'STRING';
}

// Attach other functions for testing
guessModel.dataToType = dataToType;
guessModel.standardize = standardize;
guessModel.shouldIndex = shouldIndex;
guessModel.pickle = pickle;

// Export
module.exports = guessModel;
