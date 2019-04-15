/**
 * Function to handle auto transforming the extracted data to
 * the model.
 */

// Dependencies
const _ = require('lodash');
const utils = require('./utils-data.js');

/**
 * Main function to take a piece of data and use the models to match
 * up the values.
 *
 * @param {object} data Data to transform
 * @param {object} models Object of models, where a key is the model name
 * @param {object} tablesOptions Options from the Tables instance.
 */
function autoTransform(data, models, tablesOptions = {}) {
  let parsed = {};

  // Go through each data point
  _.each(data, (value, field) => {
    // Find field in model
    let d = findField(field, models, 'tablesInputColumn');

    // If found attach
    if (d) {
      parsed[d.modelName] = parsed[d.modelName] || {};
      parsed[d.modelName][d.field.fieldName] = parse(
        value,
        d.field,
        tablesOptions
      );
    }
  });

  return parsed;
}

// Parse value based on field definition
function parse(value, field, tablesOptions = {}) {
  let parsed = utils.standardizeInput(value);
  let fieldType = field.type.constructor.key;

  // Integer
  if (fieldType === 'BOOLEAN') {
    parsed = utils.toBoolean(parsed);
  }
  else if (fieldType === 'INTEGER') {
    parsed = utils.toInteger(parsed);
  }
  else if (fieldType === 'FLOAT') {
    parsed = utils.toFloat(parsed);
  }
  else if (fieldType === 'DATEONLY') {
    parsed = utils.toDate(parsed, tablesOptions.dateFormat);
  }
  else if (fieldType === 'DATE') {
    parsed = utils.toDateTime(parsed, tablesOptions.datetimeFormat);
  }
  else if (fieldType === 'STRING' || fieldType === 'TEXT') {
    parsed = utils.toString(parsed);
  }

  return parsed;
}

// Find definition in models
function findField(field, models, inputField = 'tablesInputColumn') {
  let found = false;

  _.each(models, (model, modelName) => {
    // Go through fields
    _.each(model.tableAttributes, f => {
      if (f[inputField] === field) {
        found = {
          modelName,
          field: f
        };
      }
    });
  });

  return found;
}

// Export
module.exports = autoTransform;
