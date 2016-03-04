module.exports = require("./lib/stream-to-sql.js");


// var a = new module.exports({
//   input: "./tests/data/nyc-water-quality-complaints.json",
//   inputType: "json",
//   inputOptions: "*"
// });

var a = new module.exports({
  input: "./tests/data/nyc-water-quality-complaints.csv"
});
