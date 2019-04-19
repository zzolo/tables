/* global describe, it */

// Dependencies
const path = require('path');
const assert = require('assert');
const { tables, Tables } = require('../lib/tables.js');

// Fixtures
const fixturesPath = path.join(__dirname, './fixtures');
const fixtureWithHeaders = path.join(fixturesPath, 'test-with-headers.csv');

// Tables
describe('tables', () => {
  // Module
  describe('module', () => {
    assert.strictEqual(typeof tables, 'function');
    assert.strictEqual(typeof Tables, 'function');
  });

  // Constructor
  describe('constructor', () => {
    it('should attach options', () => {
      let t = new Tables({ input: fixtureWithHeaders, silent: true });
      assert.strictEqual(t.options.input, fixtureWithHeaders);
    });

    it('should throw on bad input', () => {
      assert.throws(() => {
        new Tables({ input: 'no-exist', silent: true });
      });
    });

    it('should throw on bad format', () => {
      assert.throws(() => {
        new Tables({
          input: fixtureWithHeaders,
          format: 'unknown',
          silent: true
        });
      });
    });

    it('should throw on bad models', () => {
      assert.throws(() => {
        new Tables({ input: fixtureWithHeaders, models: 'bad', silent: true });
      });
    });

    it('should throw on bad transformer', () => {
      assert.throws(() => {
        new Tables({
          input: fixtureWithHeaders,
          transformer: 'bad',
          silent: true
        });
      });
    });

    it('should set defaults', () => {
      let t = new Tables({ input: fixtureWithHeaders, silent: true });

      assert.strictEqual(
        t.options.db,
        `sqlite://${fixtureWithHeaders.replace(/csv$/, 'sqlite')}`
      );
      assert.strictEqual(t.options.format, 'csv');
      assert.strictEqual(t.options.tableName, 'test_with_headers');
    });
  });
});
