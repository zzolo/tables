/* global describe, it */

// Dependencies
var assert = require('assert');
var guessModel = require('../lib/guess-model.js');

// Utils tests
describe('guess-models', () => {
  // shouldIndex function
  describe('shouldIndex', () => {
    it('should handle default index names', () => {
      assert.strictEqual(guessModel.shouldIndex('aaaa'), false);
      assert.strictEqual(guessModel.shouldIndex('column key'), true);
      assert.strictEqual(guessModel.shouldIndex('id'), true);
      assert.strictEqual(guessModel.shouldIndex('address name'), true);
      assert.strictEqual(guessModel.shouldIndex('1234'), false);
    });

    it('should handle custom regular expressions', () => {
      assert.strictEqual(
        guessModel.shouldIndex('aaaa', { fieldsToIndex: /^(aaaa)$/i }),
        true
      );
      assert.strictEqual(
        guessModel.shouldIndex('bbbbb', { fieldsToIndex: /^(aaaa)$/i }),
        false
      );
      assert.strictEqual(
        guessModel.shouldIndex('custom key field', {
          fieldsToIndex: /key.*field/i
        }),
        true
      );
    });

    it('should handle custom strings', () => {
      assert.strictEqual(
        guessModel.shouldIndex('aaaa', { fieldsToIndex: '^(aaaa)$' }),
        true
      );
      assert.strictEqual(
        guessModel.shouldIndex('bbbbb', { fieldsToIndex: '^(aaaa)$' }),
        false
      );
      assert.strictEqual(
        guessModel.shouldIndex('custom KEY field', {
          fieldsToIndex: 'key.*field'
        }),
        true
      );
    });
  });

  // pickle function
  describe('pickle', () => {
    // Common date options
    let oStrict = {
      datetimeFormat: 'DD-MM-YYYY hh:mm:ss',
      dateFormat: 'DD-MM-YYYY',
      dateStrictMode: true
    };
    // No strict mode causes probablems with
    // regular numbers, i.e. it will parse a date for '42'
    let oNotStrict = {
      datetimeFormat: 'DD-MM-YYYY hh:mm:ss',
      dateFormat: 'DD-MM-YYYY',
      dateStrictMode: false
    };

    it('should find integers', () => {
      assert.strictEqual(guessModel.pickle(1), 'INTEGER');
      assert.strictEqual(guessModel.pickle(1234), 'INTEGER');
      assert.strictEqual(guessModel.pickle(-1), 'INTEGER');
      assert.strictEqual(guessModel.pickle(0), 'INTEGER');
      assert.strictEqual(guessModel.pickle('1'), 'INTEGER');
      assert.strictEqual(guessModel.pickle('1,123'), 'INTEGER');
      assert.strictEqual(guessModel.pickle('-1'), 'INTEGER');
      assert.strictEqual(guessModel.pickle('0'), 'INTEGER');

      // With date options
      assert.strictEqual(guessModel.pickle('1', oStrict), 'INTEGER');
      //assert.strictEqual(guessModel.pickle('1', oNotStrict), 'INTEGER');
    });

    it('should find floats', () => {
      //assert.strictEqual(guessModel.pickle(1.0), 'FLOAT');
      assert.strictEqual(guessModel.pickle(1123.9), 'FLOAT');
      assert.strictEqual(guessModel.pickle(-1.8), 'FLOAT');
      assert.strictEqual(guessModel.pickle(0.000001), 'FLOAT');
      assert.strictEqual(guessModel.pickle('1.0'), 'FLOAT');
      assert.strictEqual(guessModel.pickle('1,123.9'), 'FLOAT');
      assert.strictEqual(guessModel.pickle('-1.8'), 'FLOAT');
      assert.strictEqual(guessModel.pickle('0.000001'), 'FLOAT');

      // With date options
      assert.strictEqual(guessModel.pickle('1.1', oStrict), 'FLOAT');
      //assert.strictEqual(guessModel.pickle('1.1', oNotStrict), 'FLOAT');
    });

    it('should find booleans', () => {
      assert.strictEqual(guessModel.pickle(true), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle(false), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('true'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('false'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('y'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('n'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('yes'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('no'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('YES'), 'BOOLEAN');
      assert.strictEqual(guessModel.pickle('No'), 'BOOLEAN');

      // With date options
      assert.strictEqual(guessModel.pickle('yes', oStrict), 'BOOLEAN');
      //assert.strictEqual(guessModel.pickle('no', oNotStrict), 'BOOLEAN');
    });

    it('should find dates', () => {
      assert.strictEqual(guessModel.pickle(new Date()), 'DATE');

      assert.strictEqual(guessModel.pickle('01-12-2010 01:01:00', oStrict), 'DATE');
      //assert.strictEqual(guessModel.pickle('01-12-2010 01:01:00', oNotStrict), 'DATE');

      assert.strictEqual(guessModel.pickle('7/24/1963 0:00:00', oStrict), 'DATE');
      //assert.strictEqual(guessModel.pickle('7/24/1963 0:00:00', oNotStrict), 'DATE');

      // Default regex
      assert.strictEqual(guessModel.pickle('01/01/2020 01:01:00 am'), 'DATE');
      assert.strictEqual(guessModel.pickle('1/1/2020 1:01:00 pm'), 'DATE');
    });

    it('should find dateonly', () => {
      assert.strictEqual(guessModel.pickle('01-12-2020', oStrict), 'DATEONLY');
      //assert.strictEqual(guessModel.pickle('01-12-2020', oNotStrict), 'DATEONLY');

      // Default regex
      assert.strictEqual(guessModel.pickle('01/01/2020'), 'DATEONLY');
      assert.strictEqual(guessModel.pickle('1/1/2020'), 'DATEONLY');
    });

    it('should find strings', () => {
      assert.strictEqual(guessModel.pickle('abc'), 'STRING');
      assert.strictEqual(guessModel.pickle('abc', oStrict), 'STRING');
    });
  });
});
