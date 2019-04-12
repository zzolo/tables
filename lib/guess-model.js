/**
 * Guess model from column data
 */

// Dependencies
let _ = require('lodash');
let moment = require('moment-timezone');
let Sequelize = require('sequelize');
let utils = require('./utils-data');

// Guess model from data from rows of data
//
// And should return a model object
// {
//   fields: {
//     columnA: {
//       tablesInputColumn: "A",
//       type: Sequelize.INTEGER
//       // sequelize options
//       // http://docs.sequelizejs.com/manual/models-definition.html
//     }
//   },
//   // Options for Sequelize models
//   options: {
//     // http://docs.sequelizejs.com/manual/models-definition.html
//     indexes [
//       { // sequelize options }
//     ]
//   }
// }
function guessModel(data, tablesOptions = {}, sequlizeInstance) {
  let fields = {};
  let modelName = tablesOptions.tableName
    ? _.camelCase(tablesOptions.tableName)
    : 'tablesAutoImport';
  let modelOptions = {
    sequelize: sequlizeInstance,
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    tableName: _.snakeCase(modelName),
    modelName
  };

  // Go through each column
  _.each(data[0], (v, columnName) => {
    let fieldName = _.camelCase(columnName);
    let columnData = _.map(data, columnName);
    let field = {};

    // Set tables-specific property
    field.tablesInputColumn = columnName;

    // Guess type
    field.type = dataToType(columnData, columnName, tablesOptions);

    // Allow null by default
    field.allowNull = true;

    // Attach to fields
    fields[fieldName] = field;

    // Make indexes based on column name
    if (shouldIndex(_.snakeCase(fieldName))) {
      // Though our field names are camelCase and we use underscored: true
      // Sequelize does not take this into account for the index fields, and
      // so we have to use the snakeCase version
      modelOptions.indexes.push({ fields: [_.snakeCase(fieldName)] });
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

    // modelOptions.indexes.push({
    //   fields: _.map(keyFields, _.snakeCase),
    //   name: _.snakeCase(`${modelName}_uniq`),
    //   unique: true
    // });
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
  TablesAutoModel.modelName = modelName;
  return TablesAutoModel;
}

// Data to type
function dataToType(data, name, tablesOptions = {}) {
  let knownID = /(^|\s|_|-)(zip|phone|id)(_|\s|-|$)/i;

  // If data is not a simple type, then just use text.
  // TODO: Maybe use JSON type
  // http://docs.sequelizejs.com/manual/data-types.html
  if (_.isArray(data[0]) || _.isObject(data[0])) {
    return Sequelize.TEXT;
  }

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
  let maxLength = _.maxBy(data, 'length');
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
    return new Sequelize.STRING(maxLength * 2);
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
function shouldIndex(name) {
  let nameTest = /(^|_|-|\s)(id|name|key|amount|amt)($|_|-|\s)/g;
  return nameTest.test(name);
}

// Find type.  Should return base Sequelize type
function pickle(value, options) {
  options = options || {};
  // Tests
  let floatTest = /^(-|)[\d,]+.\d+$/g;
  let intTest = /^\d+$/g;
  let booleanTest = /^(true|false)$/g;
  let dateTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/g;
  let datetimeTest = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{1,2}(:\d{1,2}|)(\s+|)(am|pm|)$/gi;

  // Test values
  if (
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

// Export
module.exports = guessModel;
