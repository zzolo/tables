/**
 * Configuration for NY Campaign Finance data
 *
 * Source:
 * http://www.elections.ny.gov/CFViewReports.html
 *
 * This data is not escaped properly, specifically " is not "",
 * as well there are newline characters in fields, so
 * we have to parse this out ourselves.
 */

// Depdendencies
var Sequelize = require("sequelize");
var _ = require("lodash");
var byline = require("byline");

// Consistent values
var row = "";
var colCount;

// Tables config
var config = {
  id: "ny-campaign-finance",
  pipe: byline.createStream(),
  resumable: true,
  autoparse: false,
  dateFormat: "MM/DD/YYYY",
  datetimeFormat: "MM/DD/YYYY HH:mm:ss",
  // Comes in as buffer
  parser: function(line) {
    line = line.toString();
    var colCount = _.size(transactionFields);
    var possibleRow = row + line;
    var possibleFields = possibleRow.slice(1, possibleRow.length - 1).split("\",\"");

    // Unfortunately there are some fields that have new line characters in them
    // and there could be exta commas
    if (line.slice(-1) !== "\"" || possibleFields.length < colCount) {
      row = row + line;
      return false;
    }
    // Otherwise just use what we have
    else {
      line = row + line;
      row = "";
    }

    // Parse and match with headers
    var fields = line.slice(1, line.length - 1).split("\",\"");
    var parsed = {};
    _.each(_.keys(transactionFields), function(h, hi) {
      parsed[h] = fields[hi];
    });

    // Use auto parser to coerce the types
    parsed = this.autoParser(parsed, this.options.models, {
      dateFormat: this.options.dateFormat,
      datetimeFormat: this.options.datetimeFormat
    });

    //checkFieldLength(parsed, "other_receipt_code");

    return parsed;
  },
  models: {
    transactions: {
      tableName: "transactions",
      fields: {},
      options: {}
    }
  }
};

// Transaction field
var transactionFields = {
  "filer_id": new Sequelize.STRING(32),
  // See reportType in filers
  "report_id": new Sequelize.STRING(32),
  "transaction_code": new Sequelize.STRING(32),
  "election_year": new Sequelize.INTEGER(),
  "transaction_id": new Sequelize.STRING(32),
  // MM/DD/YYYY
  "transaction_date": new Sequelize.DATEONLY(),
  "received_date": new Sequelize.DATEONLY(),
  "contributor_code": new Sequelize.STRING(32),
  "contribution_type_code": new Sequelize.STRING(16),
  "corp_name": new Sequelize.STRING(128),
  "first": new Sequelize.STRING(64),
  "middle": new Sequelize.STRING(64),
  "last": new Sequelize.STRING(64),
  "address": new Sequelize.STRING(128),
  "city": new Sequelize.STRING(64),
  "state": new Sequelize.STRING(8),
  "zip": new Sequelize.STRING(16),
  "check_number": new Sequelize.STRING(32),
  "check_date": new Sequelize.DATEONLY(),
  "scheduled_amount": new Sequelize.FLOAT(),
  // Amount forgiven, outstanding, or attributed
  "foa_amount": new Sequelize.FLOAT(),
  "description": new Sequelize.STRING(256),
  "other_receipt_code": new Sequelize.STRING(64),
  "purpose_code1": new Sequelize.STRING(32),
  "purpose_code2": new Sequelize.STRING(32),
  "explanantion": new Sequelize.STRING(256),
  "transfer_type": new Sequelize.STRING(32),
  "bank_loan_type": new Sequelize.STRING(32),
  "record_creator_id": new Sequelize.STRING(32),
  // MM/DD/YYYY HH24:MI:SS
  "record_created_datetime": new Sequelize.DATE()
};
_.each(transactionFields, function(t, ti) {
  config.models.transactions.fields[ti] = {
    name: ti,
    // Input is used with the autoparser
    input: ti,
    type: t
  };
});

var transactionsIndexes = [
  // As described by metadata, these are the 6 keys, though this does not
  // seem to be unique.
  {
    fields: ["filer_id", "report_id", "transaction_code", "election_year",
      "transaction_id", "record_created_datetime"],
    unique: true,
    name: "transactions_unique_1"
  },
  { fields: ["filer_id"] },
  { fields: ["transaction_code"] },
  { fields: ["election_year"] },
  { fields: ["transaction_date"] },
  { fields: ["corp_name"] },
  { fields: ["first"] },
  { fields: ["middle"] },
  { fields: ["last"] },
  { fields: ["address"] },
  { fields: ["first", "middle", "last"] },
  { fields: ["scheduled_amount"] }
];
config.models.transactions.options.indexes = transactionsIndexes;

// Just a helpful function to help find some issues.
function checkFieldLength(parsed, field, length) {
  length = length || transactionFields[field].options.length;
  if (parsed.transactions[field] && parsed.transactions[field].toString().length > length) {
    console.log(parsed.transactions);
    console.log(field, parsed.transactions[field]);
  }
}

// Export
module.exports = config;
