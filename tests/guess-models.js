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
});
