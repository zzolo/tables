/* global describe, it */

// Dependencies
var assert = require('assert');
var moment = require('moment-timezone');
var utils = require('../lib/utils-data.js');

// Utils tests
describe('utils-data', () => {
  // standardizeInput function
  describe('standardizeInput', () => {
    it('should return null for false-like values', () => {
      assert.strictEqual(utils.standardizeInput(undefined), null);
      assert.strictEqual(utils.standardizeInput(null), null);
      assert.strictEqual(utils.standardizeInput(NaN), null);
    });

    it('should return null for empty string', () => {
      assert.strictEqual(utils.standardizeInput(''), null);
    });

    it('should return 0 for 0', () => {
      assert.strictEqual(utils.standardizeInput('0'), '0');
      assert.strictEqual(utils.standardizeInput(0), 0);
    });

    it('should return boolean for boolean', () => {
      assert.strictEqual(utils.standardizeInput(false), false);
      assert.strictEqual(utils.standardizeInput(true), true);
    });

    it('should handle common empty named values', () => {
      assert.strictEqual(utils.standardizeInput('unspecified'), null);
      assert.strictEqual(utils.standardizeInput('unknown'), null);
      assert.strictEqual(utils.standardizeInput('none'), null);
      assert.strictEqual(utils.standardizeInput('NONE'), null);
      assert.strictEqual(utils.standardizeInput('null'), null);
    });
  });

  // toBoolean function
  describe('toBoolean', () => {
    it('should handle falsey values except null', () => {
      assert.strictEqual(utils.toBoolean(undefined), false);
      assert.strictEqual(utils.toBoolean(false), false);
      assert.strictEqual(utils.toBoolean(0), false);
      assert.strictEqual(utils.toBoolean(NaN), false);
      assert.strictEqual(utils.toBoolean(''), false);
    });

    it('should return null for null', () => {
      assert.strictEqual(utils.toBoolean(null), null);
    });

    it('should handle common name values', () => {
      assert.strictEqual(utils.toBoolean('NO'), false);
      assert.strictEqual(utils.toBoolean('n'), false);
      assert.strictEqual(utils.toBoolean('FALSE'), false);
      assert.strictEqual(utils.toBoolean('false'), false);
    });

    it('should return true for all else', () => {
      assert.strictEqual(utils.toBoolean(true), true);
      assert.strictEqual(utils.toBoolean('1'), true);
      assert.strictEqual(utils.toBoolean(1), true);
      assert.strictEqual(utils.toBoolean(0.1), true);
      assert.strictEqual(utils.toBoolean('yes'), true);
      assert.strictEqual(utils.toBoolean('anything'), true);
    });
  });

  // toString function
  describe('toString', () => {
    it('should handle empty values', () => {
      assert.strictEqual(utils.toString(undefined), null);
      assert.strictEqual(utils.toString(NaN), null);
      assert.strictEqual(utils.toString(null), null);
      assert.strictEqual(utils.toString(''), null);
    });

    it('should return strings of false-like values', () => {
      assert.strictEqual(utils.toString(false), 'false');
      assert.strictEqual(utils.toString(0), '0');
    });

    it('should handle complex values', () => {
      assert.strictEqual(utils.toString({ t: true }), '{"t":true}');
      assert.strictEqual(utils.toString([1]), '[1]');
    });

    it('should handle regular values', () => {
      assert.strictEqual(utils.toString('a'), 'a');
      assert.strictEqual(utils.toString(123), '123');
      assert.strictEqual(utils.toString(123.4), '123.4');
      assert.strictEqual(utils.toString(true), 'true');
    });
  });

  // toInteger function
  describe('toInteger', () => {
    it('should return null for empty values', () => {
      assert.strictEqual(utils.toInteger(undefined), null);
      assert.strictEqual(utils.toInteger(NaN), null);
      assert.strictEqual(utils.toInteger(null), null);
      assert.strictEqual(utils.toInteger(''), null);
    });

    it('should return null for complex values', () => {
      assert.strictEqual(utils.toInteger({ t: true }), null);
      assert.strictEqual(utils.toInteger([1]), null);
    });

    it('should handle boolean values', () => {
      assert.strictEqual(utils.toInteger(true), 1);
      assert.strictEqual(utils.toInteger(false), 0);
    });

    it('should handle strings', () => {
      assert.strictEqual(utils.toInteger('0'), 0);
      assert.strictEqual(utils.toInteger('1'), 1);
      assert.strictEqual(utils.toInteger('0000001'), 1);
      assert.strictEqual(
        utils.toInteger('slkdjfflksjdflkdjf12sdfsfddff.sdsd2'),
        12
      );
      assert.strictEqual(utils.toInteger('-1.8'), -2);
    });

    it('should handle numbers and round decimals', () => {
      assert.strictEqual(utils.toInteger(0), 0);
      assert.strictEqual(utils.toInteger(1), 1);
      assert.strictEqual(utils.toInteger(12), 12);
      assert.strictEqual(utils.toInteger(12.3), 12);
      assert.strictEqual(utils.toInteger(12.8), 13);
      assert.strictEqual(utils.toInteger(0.1), 0);
      assert.strictEqual(utils.toInteger(-6), -6);
    });
  });

  // toFloat function
  describe('toFloat', () => {
    it('should return null for empty values', () => {
      assert.strictEqual(utils.toFloat(undefined), null);
      assert.strictEqual(utils.toFloat(NaN), null);
      assert.strictEqual(utils.toFloat(null), null);
      assert.strictEqual(utils.toFloat(''), null);
    });

    it('should return null for booleans', () => {
      assert.strictEqual(utils.toFloat(true), null);
      assert.strictEqual(utils.toFloat(false), null);
    });

    it('should return null for complex values', () => {
      assert.strictEqual(utils.toFloat({ t: true }), null);
      assert.strictEqual(utils.toFloat([1]), null);
    });

    it('should handle strings', () => {
      assert.strictEqual(utils.toFloat('0'), 0);
      assert.strictEqual(utils.toFloat('1'), 1);
      assert.strictEqual(utils.toFloat('1.23'), 1.23);
      assert.strictEqual(utils.toFloat('0000001.2'), 1.2);
      assert.strictEqual(utils.toFloat('1,234.56'), 1234.56);
      assert.strictEqual(
        utils.toFloat('slkdjfflksjdflkdjf12sdfsfddff.sdsd2'),
        12.2
      );
      assert.strictEqual(utils.toFloat('-1.23'), -1.23);
    });

    it('should handle numbers', () => {
      assert.strictEqual(utils.toFloat(0), 0);
      assert.strictEqual(utils.toFloat(1), 1);
      assert.strictEqual(utils.toFloat(12), 12);
      assert.strictEqual(utils.toFloat(12.3), 12.3);
      assert.strictEqual(utils.toFloat(12.8), 12.8);
      assert.strictEqual(utils.toFloat(0.1), 0.1);
      assert.strictEqual(utils.toFloat(0.123456), 0.123456);
      assert.strictEqual(utils.toFloat(-1.23), -1.23);
    });
  });

  // toDate function
  describe('toDate', () => {
    it('should return null for empty and falsey values', () => {
      assert.strictEqual(utils.toDate(undefined), null);
      assert.strictEqual(utils.toDate(NaN), null);
      assert.strictEqual(utils.toDate(null), null);
      assert.strictEqual(utils.toDate(''), null);
      assert.strictEqual(utils.toDate(false), null);
    });

    it('should return null for booleans', () => {
      assert.strictEqual(utils.toDate(false), null);
      assert.strictEqual(utils.toDate(true), null);
    });

    it('should handle strings and default format', () => {
      assert.ok(utils.toDate('01/01/2000') instanceof Date);
      assert.strictEqual(
        utils.toDate('01/01/2000').toString(),
        moment('2000-01-01')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDate('1/1/2000').toString(),
        moment('2000-01-01')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDate('1/30/2000').toString(),
        moment('2000-01-30')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDate('12/1/2000').toString(),
        moment('2000-12-01')
          .toDate()
          .toString()
      );
    });

    it('should handle strings and custom format', () => {
      var format = 'YYYY---M---DD';
      assert.ok(utils.toDate('2000---01---01', format) instanceof Date);
      assert.strictEqual(
        utils.toDate('2000---01---01', format).toString(),
        moment('2000-01-01')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDate('2000---1---01', format).toString(),
        moment('2000-01-01')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDate('1900---12---12', format).toString(),
        moment('1900-12-12')
          .toDate()
          .toString()
      );
    });
  });

  // toDate function
  describe('toDateTime', () => {
    it('should return null for empty and falsey values', () => {
      assert.strictEqual(utils.toDateTime(undefined), null);
      assert.strictEqual(utils.toDateTime(NaN), null);
      assert.strictEqual(utils.toDateTime(null), null);
      assert.strictEqual(utils.toDateTime(''), null);
      assert.strictEqual(utils.toDateTime(false), null);
    });

    it('should return null for booleans', () => {
      assert.strictEqual(utils.toDateTime(false), null);
      assert.strictEqual(utils.toDateTime(true), null);
    });

    it('should handle strings and default format', () => {
      assert.strictEqual(utils.toDateTime('01/01/2000') instanceof Date, false);
      assert.strictEqual(
        utils.toDateTime('01/01/2000 12:04') instanceof Date,
        false
      );
      assert.strictEqual(
        utils.toDateTime('01/01/2000 12:04:01') instanceof Date,
        false
      );
      assert.ok(utils.toDateTime('01/01/2000 12:04:01 am') instanceof Date);
      assert.strictEqual(
        utils.toDateTime('01/01/2000 01:02:03 am').toString(),
        moment('2000-01-01T01:02:03')
          .toDate()
          .toString()
      );
      assert.strictEqual(
        utils.toDateTime('01/01/2000 01:02:03 pm').toString(),
        moment('2000-01-01T13:02:03')
          .toDate()
          .toString()
      );
    });

    it('should handle strings and custom format', () => {
      var format = 'YYYY---M---DD *** H:::m:::s';
      assert.ok(
        utils.toDateTime('2000---01---01 *** 13:::01:::00', format) instanceof
          Date
      );
      assert.strictEqual(
        utils.toDateTime('2000---01---01 *** 13:::01:::00', format).toString(),
        moment('2000-01-01T13:01:00')
          .toDate()
          .toString()
      );
    });
  });
});
