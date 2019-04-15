/**
 * This provides a transformer function.  This will get run before using
 * data to guess the model.
 */

module.exports = (d, models, options) => {
  // Add a custom key column
  d.customKey = `custom-${d['Unique Key']}`;
  return d;
};
