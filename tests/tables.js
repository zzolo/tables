/* global describe, it, afterEach */

// Dependencies
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sqlite = require('sqlite3');
const { tables, Tables } = require('../lib/tables.js');

// Fixtures
const fixturesPath = path.join(__dirname, './fixtures');
const fixtureWithHeaders = path.join(fixturesPath, 'test-with-headers.csv');

// Promisefy sqlite
function sqliteRun(db, method = 'all', ...params) {
  return new Promise((resolve, reject) => {
    db[method](...params, (error, ...results) => {
      if (error) {
        return reject(error);
      }

      resolve(...results);
    });
  });
}

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

  // Start
  describe('start', () => {
    let dbPath = path.join(fixturesPath, 'tables-start-test.sqlite');

    // AFter each remove sqlite files
    afterEach(() => {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    });

    it('should create a database table correctly', async done => {
      let tableName = 'tables_start_test';

      try {
        let t = new Tables({
          input: fixtureWithHeaders,
          silent: true,
          db: `sqlite://${dbPath}`,
          tableName
        });
        await t.start();

        // Make sure there
        assert.ok(fs.existsSync(dbPath));

        // Connect to db
        let db = new sqlite.Database(dbPath);

        // Check rows
        let rows = await sqliteRun(
          db,
          'all',
          `SELECT COUNT(*) AS count FROM ${tableName}`
        );
        assert.strictEqual(rows[0].count, 4);

        // Check data
        let all = await sqliteRun(db, 'all', `SELECT * FROM ${tableName}`);
        assert.deepEqual(all, [
          {
            integer_1: 1,
            float_1: 2,
            string_1: 'a thing',
            boolean_1: 1,
            tables_primary_key: 1
          },
          {
            integer_1: 2,
            float_1: 3.2,
            string_1: 'another thing',
            boolean_1: 0,
            tables_primary_key: 2
          },
          {
            integer_1: 3,
            float_1: 4.32,
            string_1: 'one more thing',
            boolean_1: 0,
            tables_primary_key: 3
          },
          {
            integer_1: 4,
            float_1: 54.32101,
            string_1: 'last thing',
            boolean_1: 1,
            tables_primary_key: 4
          }
        ]);

        // Close connect
        db.close();

        // done
        done();
      }
      catch (e) {
        done(e);
      }
    }).timeout(5000);

    it('should call finish hook', async done => {
      let tableName = 'tables_start_test_hook';
      let hookCalled = false;

      try {
        let t = new Tables({
          input: fixtureWithHeaders,
          silent: true,
          db: `sqlite://${dbPath}`,
          tableName,
          hooks: {
            finish: (...args) => {
              hookCalled = args;
            }
          }
        });

        await t.start();
        assert.ok(hookCalled);
        assert.strictEqual(typeof hookCalled[0], 'object');
        assert.strictEqual(typeof hookCalled[1], 'object');
        assert.strictEqual(typeof hookCalled[2], 'object');
        done();
      }
      catch (e) {
        done(e);
      }
    }).timeout(5000);
  });
});
