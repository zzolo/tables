/* global describe, it, before, beforeEach, after, afterEach */

// Dependencies
var assert = require("assert");
var exec = require("child_process").exec;
var path = require("path");
var fixturesPath = path.join(__dirname, "./fixtures");
var binPath = path.join(__dirname, "../bin");
var commandPath = path.join(binPath, "tables");

// Fixtures
var fCSVWithHeaders = path.join(fixturesPath, "test-with-headers.csv");

// DB tests
describe("command line", function() {
  // Return value of command line
  describe("return value", function() {
    it("should return 0 when ok", function(done) {
      exec(commandPath + " -i " + fCSVWithHeaders, done);
    });

    it("should return 1 when not ok", function(done) {
      exec(commandPath + " -t badtype -i " + fCSVWithHeaders, function(error, stdout, stderr) {
        if (error && error.code === 1) {
          assert.ok(true);
        }
        else {
          assert.fail(true);
        }

        done();
      });
    });
  });
});
