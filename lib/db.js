/**
 * Some database fuctions not built into Sequelize.
 */

// Dependencies
var _ = require("lodash");
var Sequelize = require("sequelize");


// Queue-ify db request
function modelMethod(model, method, data, done) {
  model[method](data).then(function(results) {
    done(null, results);
  })
  .catch(function(error) {
    // Try again on timeout
    if (error.message == "connect ETIMEDOUT") {
      modelMethod(model, method, data, done);
      return;
    }
    done(error);
  });
}

// Queue-ify db query
function runQuery(connection, query, options, done) {
  options = _.isObject(options) ? options :
    connection.QueryTypes[options] ? { type: connection.QueryTypes[options] } : {};

  connection.query(query, options)
    .then(function(results) {
      done(null, results);
    })
    .catch(function(error) {
      done(error);
    });
}

// A wrapper to do a bulk upsert (ie multiple statements)
function bulkUpsert(connection, model, data, done) {
  var query;
  var n = connection.connectionManager.dialectName;

  // Make query based on dialiect
  if (n === "mysql" || n === "mariadb" || n === "mysqli") {
    query = mysqlBulkUpsert(model, data);
  }
  else if (n === "sqlite") {
    query = sqliteBulkUpsert(model, data);
  }
  else if (n === "pgsql") {
    query = pgsqlBulkUpsert(model, data);
  }

  // Run query
  if (query) {
    runQuery(connection, query, { raw: true }, done);
  }
  else {
    done(new Error("Could not create query for bulkUpsert."));
  }
}

// Mysql query format bulk upsert
function mysqlBulkUpsert(model, data) {
  var mysql = require("mysql");
  var queries = [ "SET AUTOCOMMIT = 0" ];

  // Transform data
  _.each(data, function(d) {
    var query = "REPLACE INTO " + model.tableName + " ([[COLUMNS]]) VALUES (?)";
    query = query.replace("[[COLUMNS]]", _.keys(d).join(", "));
    query = mysql.format(query, [ _.values(d) ]);
    queries.push(query);
  });

  // Create final output and format
  queries.push("COMMIT");
  queries.push("SET AUTOCOMMIT = 1");
  return queries.join("; ");
}

// SQLite query format bulk upsert
function sqliteBulkUpsert(model, data) {
  var mysql = require("mysql");
  var queries = [];

  // Transform data
  _.each(data, function(d) {
    var query = "INSERT OR REPLACE INTO " + model.tableName + " ([[COLUMNS]]) VALUES (?)";
    query = query.replace("[[COLUMNS]]", _.keys(d).join(", "));
    query = mysql.format(query, [ _.values(d) ]);
    queries.push(query);
  });

  // Create final output and format
  return queries.join("; ");
}

// PGSQL query format bulk upsert
function pgsqlBulkUpsert(model, data) {
  var mysql = require("mysql");
  var queries = [];

  // Transform data
  _.each(data, function(d) {
    var query = "INSERT INTO " + model.tableName + " ([[COLUMNS]]) VALUES (?) ON CONFLICT DO UPDATE";
    query = query.replace("[[COLUMNS]]", _.keys(d).join(", "));
    query = mysql.format(query, [ _.values(d) ]);
    queries.push(query);
  });

  // Create final output and format
  return queries.join("; ");
}


// Exports
module.exports = {
  modelMethod: modelMethod,
  runQuery: runQuery,
  bulkUpsert: bulkUpsert
};
