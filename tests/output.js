/* global describe, it, before, beforeEach, after, afterEach */

// Dependencies
var assert = require("assert");
var testConsole = require("test-console");
var output = require("../lib/output.js");

// Catch output
var testOut = testConsole.stdout;
var testErr = testConsole.stderr;

// output tests
describe("output", function() {
  var outputOn = output(true);
  var outputOff = output(false);

  describe("log", function() {
    it("should output to stderr when on", function() {
      var caught = testErr.inspectSync(function() {
        outputOn.log("test");
      });

      assert.deepEqual(caught, [ "test\n" ]);
    });

    it("should not output to stderr when off", function() {
      var caught = testErr.inspectSync(function() {
        outputOff.log("test");
      });

      assert.deepEqual(caught, []);
    });
  });

  describe("error", function() {
    it("should output error to stderr when on", function() {
      var caught = testErr.inspectSync(function() {
        outputOn.error("test");
      });

      assert.deepEqual(caught, [ outputOn.bullet + outputOn.chalk.red("ERROR: test") + "\n" ]);
    });

    it("should still output error to stderr when off", function() {
      var caught = testErr.inspectSync(function() {
        outputOff.error("test");
      });

      assert.deepEqual(caught, [ outputOn.bullet + outputOn.chalk.red("ERROR: test") + "\n" ]);
    });
  });
});
