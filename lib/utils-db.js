/**
 * Some utility functions for Sequelize
 */

// Dependencies
const _ = require('lodash');
const debug = require('debug')('tables:utils-db');

/**
 * BulkUpsert
 * http://docs.sequelizejs.com/class/lib/model.js~Model.html#static-method-bulkCreate
 * https://stackoverflow.com/questions/48124949/nodejs-sequelize-bulk-upsert
 */
async function bulkUpsert(data = [], Model, tablesOptions = {}) {
  let dialect = Model.sequelize.connectionManager.dialectName;

  // Assumes all data has the same attributes
  let fields = Object.keys(data[0]);

  // Transaction
  let transaction = tablesOptions.transactions
    ? await Model.sequelize.transaction()
    : undefined;

  // Bulk upsert
  try {
    if (dialect.match(/mysql|mysqli|mariadb/i)) {
      await Model.bulkCreate(data, {
        fields,
        updateOnDuplicate: fields,
        transaction
      });
    }
    else if (dialect.match(/postgres|pgsql/i)) {
      await bulkUpsertPostgres(data, Model, tablesOptions, transaction);
    }
    else if (dialect.match(/sqlite/i)) {
      await bulkUpsertSqlite(data, Model, tablesOptions, transaction);
    }
  }
  catch (e) {
    debug(e);
    if (transaction) {
      await transaction.rollback();
    }
    throw e;
  }

  // Commit
  if (transaction) {
    await transaction.commit();
  }
}

/**
 * SQLite bulk upsert
 */
async function bulkUpsertSqlite(
  data = [],
  Model,
  tablesOptions = {},
  transaction
) {
  let queries = [];
  let values = [];
  let attributeMap = d => Model.rawAttributes[d].field;

  // Transform data
  _.each(data, function(d) {
    let query = `INSERT OR REPLACE INTO ${Model.tableName} (${_.map(
      _.keys(d),
      attributeMap
    ).join(', ')}) VALUES (${_.map(d, function(v) {
      return '?';
    }).join(', ')})`;

    // Get values
    values = values.concat(_.values(d));
    queries.push(query);
  });

  // Run query
  return Model.sequelize.query(queries.join('; '), {
    type: Model.sequelize.QueryTypes.UPSERT,
    raw: true,
    transaction,
    replacements: values
  });
}

/**
 * Postgres bulk upsert
 */
async function bulkUpsertPostgres(
  data = [],
  Model,
  tablesOptions = {},
  transaction
) {
  let queries = [];
  let values = [];
  let attributeMap = d => Model.rawAttributes[d].field;
  let primaryKeys = _.filter(
    _.map(Model.rawAttributes, (d, di) => (d.primaryKey ? di : undefined))
  );
  let primaryKeySQLFields = _.map(primaryKeys, attributeMap);

  // Transform data
  _.each(data, function(row) {
    let dataWithoutPrimaryKeys = _.omit(row, primaryKeys);

    let query = `INSERT INTO ${Model.tableName} (${_.map(
      _.keys(row),
      attributeMap
    ).join(', ')})
    VALUES (${_.map(row, () => '?').join(', ')})
    ON CONFLICT (${primaryKeySQLFields.join(', ')})
    DO UPDATE SET
    ${_.map(dataWithoutPrimaryKeys, (v, vi) => {
    return attributeMap(vi) + ' = ?';
  }).join(', ')}`;

    // Get values
    values = values
      .concat(_.values(row))
      .concat(_.values(dataWithoutPrimaryKeys));
    queries.push(query);
  });

  // Run query
  return Model.sequelize.query(queries.join('; '), {
    type: Model.sequelize.QueryTypes.INSERT,
    raw: true,
    transaction,
    replacements: values
  });
}

module.exports = {
  bulkUpsert
};
