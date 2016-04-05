/* global describe, it, before, beforeEach, after, afterEach */

// Dependencies
var assert = require("assert");
var utils = require("../lib/utils.js");

// Utils tests
describe("utils", function() {
  // toSQLName function
  describe("toSQLName", function() {
    it("should return undefined for falsey values", function() {
      assert.strictEqual(utils.toSQLName(undefined), undefined);
      assert.strictEqual(utils.toSQLName(false), undefined);
      assert.strictEqual(utils.toSQLName(0), undefined);
      assert.strictEqual(utils.toSQLName(null), undefined);
      assert.strictEqual(utils.toSQLName(NaN), undefined);
      assert.strictEqual(utils.toSQLName(""), undefined);
    });

    it("should return undefined for complex values", function() {
      assert.strictEqual(utils.toSQLName([]), undefined);
      assert.strictEqual(utils.toSQLName({}), undefined);
    });

    it("should handle numbers input", function() {
      assert.strictEqual(utils.toSQLName(123), "123");
      assert.strictEqual(utils.toSQLName(12.3), "12_3");
    });

    it("should handle string input", function() {
      assert.strictEqual(utils.toSQLName("thing$!@#$**$one"), "thing_one");
      assert.strictEqual(utils.toSQLName("t"), "t");
      assert.strictEqual(utils.toSQLName("t-a"), "t_a");
      assert.strictEqual(utils.toSQLName("t______r_s     t"), "t_r_s_t");
    });
  });

  // toModelName function
  describe("toModelName", function() {
    it("should return undefined for falsey values", function() {
      assert.strictEqual(utils.toModelName(undefined), undefined);
      assert.strictEqual(utils.toModelName(false), undefined);
      assert.strictEqual(utils.toModelName(0), undefined);
      assert.strictEqual(utils.toModelName(null), undefined);
      assert.strictEqual(utils.toModelName(NaN), undefined);
      assert.strictEqual(utils.toModelName(""), undefined);
    });

    it("should return undefined for complex values", function() {
      assert.strictEqual(utils.toModelName([]), undefined);
      assert.strictEqual(utils.toModelName({}), undefined);
    });

    it("should handle numbers input", function() {
      assert.strictEqual(utils.toModelName(123), "123");
      assert.strictEqual(utils.toModelName(12.3), "12_3");
    });

    it("should handle string input", function() {
      assert.strictEqual(utils.toModelName("thing$!@#$**$one"), "thingOne");
      assert.strictEqual(utils.toModelName("t"), "t");
      assert.strictEqual(utils.toModelName("t-a"), "tA");
      assert.strictEqual(utils.toModelName("t______r_s     t"), "tRST");
    });
  });

  // standardizeInput function
  describe("standardizeInput", function() {
    it("should return null for false-like values", function() {
      assert.strictEqual(utils.standardizeInput(undefined), null);
      assert.strictEqual(utils.standardizeInput(null), null);
      assert.strictEqual(utils.standardizeInput(NaN), null);
    });

    it("should return null for empty string", function() {
      assert.strictEqual(utils.standardizeInput(""), null);
    });

    it("should return 0 for 0", function() {
      assert.strictEqual(utils.standardizeInput("0"), "0");
      assert.strictEqual(utils.standardizeInput(0), 0);
    });

    it("should return boolean for boolean", function() {
      assert.strictEqual(utils.standardizeInput(false), false);
      assert.strictEqual(utils.standardizeInput(true), true);
    });

    it("should handle common empty named values", function() {
      assert.strictEqual(utils.standardizeInput("unspecified"), null);
      assert.strictEqual(utils.standardizeInput("unknown"), null);
      assert.strictEqual(utils.standardizeInput("none"), null);
      assert.strictEqual(utils.standardizeInput("NONE"), null);
      assert.strictEqual(utils.standardizeInput("null"), null);
    });
  });

  // toBoolean function
  describe("toBoolean", function() {
    it("should handle falsey values except null", function() {
      assert.strictEqual(utils.toBoolean(undefined), false);
      assert.strictEqual(utils.toBoolean(false), false);
      assert.strictEqual(utils.toBoolean(0), false);
      assert.strictEqual(utils.toBoolean(NaN), false);
      assert.strictEqual(utils.toBoolean(""), false);
    });

    it("should return null for null", function() {
      assert.strictEqual(utils.toBoolean(null), null);
    });

    it("should handle common name values", function() {
      assert.strictEqual(utils.toBoolean("NO"), false);
      assert.strictEqual(utils.toBoolean("n"), false);
      assert.strictEqual(utils.toBoolean("FALSE"), false);
      assert.strictEqual(utils.toBoolean("false"), false);
    });

    it("should return true for all else", function() {
      assert.strictEqual(utils.toBoolean(true), true);
      assert.strictEqual(utils.toBoolean("1"), true);
      assert.strictEqual(utils.toBoolean(1), true);
      assert.strictEqual(utils.toBoolean(0.1), true);
      assert.strictEqual(utils.toBoolean("yes"), true);
      assert.strictEqual(utils.toBoolean("anything"), true);
    });
  });
});
