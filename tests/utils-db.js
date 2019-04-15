/* global describe, it */

// Dependencies
var assert = require('assert');
var dbUtils = require('../lib/utils-db.js');

// DB tests
describe('utils-db', () => {
  // Parse a DB URI and add specific parts
  describe('parseUri', () => {
    it('parse URIs with different parts', () => {
      let p = dbUtils.parseUri('mysql://user:pass@hostname:1234/database');
      assert.ok(p.protocol === 'mysql:');
      assert.ok(p.dbProtocol === 'mysql');
      assert.ok(p.db === 'database');
      assert.ok(p.auth === 'user:pass');
      assert.ok(p.port === '1234');
      assert.ok(p.hostname === 'hostname');

      let s = dbUtils.parseUri('sqlite://./database.sqlite');
      assert.ok(s.protocol === 'sqlite:');
      assert.ok(s.dbProtocol === 'sqlite');
      assert.ok(s.db === './database.sqlite');

      let a = dbUtils.parseUri('sqlite:///database.sqlite');
      assert.ok(a.db === '/database.sqlite');

      let b = dbUtils.parseUri('sqlite://relative/path/database.sqlite');
      assert.ok(b.db === 'relative/path/database.sqlite');

      let c = dbUtils.parseUri('sqlite://./relative/path/database.sqlite');
      assert.ok(c.db === './relative/path/database.sqlite');
    });
  });

  // SQL name
  describe('sqlName', () => {
    it('handles not-numbers and not-strings', () => {
      assert.strictEqual(dbUtils.sqlName(undefined), undefined);
      assert.strictEqual(dbUtils.sqlName(null), null);
      assert.strictEqual(dbUtils.sqlName(Infinity), Infinity);
      let a = [];
      assert.strictEqual(dbUtils.sqlName(a), a);
      let b = { a: 1 };
      assert.strictEqual(dbUtils.sqlName(b), b);
      let c = new Date();
      assert.strictEqual(dbUtils.sqlName(c), c);
    });

    it('handles strings', () => {
      assert.strictEqual(dbUtils.sqlName('a'), 'a');
      assert.strictEqual(dbUtils.sqlName('abcsbb'), 'abcsbb');
      assert.strictEqual(dbUtils.sqlName('abcDEF'), 'abc_def');
      assert.strictEqual(dbUtils.sqlName('abc1234def'), 'abc_1234_def');
      assert.strictEqual(dbUtils.sqlName('abc=======def'), 'abc_def');
      assert.strictEqual(dbUtils.sqlName('abc=======def'), 'abc_def');
    });

    it('handles numbers and strings with beginning numbers', () => {
      assert.strictEqual(dbUtils.sqlName('1a'), 'col_1_a');
      assert.strictEqual(dbUtils.sqlName(1234), 'col_1234');
      assert.strictEqual(dbUtils.sqlName(1.234), 'col_1_234');
      assert.strictEqual(dbUtils.sqlName('1,234'), 'col_1_234');
    });

    it('adds prefix on numbers', () => {
      assert.strictEqual(dbUtils.sqlName('1a'), 'col_1_a');
      assert.strictEqual(dbUtils.sqlName('1a', 'PREFIX'), 'prefix_1_a');
      assert.strictEqual(dbUtils.sqlName('1a', 'P____'), 'p_1_a');
    });

    it('handles longs names', () => {
      let a = 'a'.repeat(64);
      let at = 'a'.repeat(60);
      assert.strictEqual(dbUtils.sqlName(a), `${at}_001`);
      assert.strictEqual(dbUtils.sqlName(a), `${at}_002`);
      assert.strictEqual(dbUtils.sqlName(a), `${at}_003`);
      assert.strictEqual(dbUtils.sqlName(a), `${at}_004`);

      let b = '1'.repeat(64);
      let bt = '1'.repeat(56);
      assert.strictEqual(dbUtils.sqlName(b), `col_${bt}_001`);
      assert.strictEqual(dbUtils.sqlName(b), `col_${bt}_002`);
      assert.strictEqual(dbUtils.sqlName(b), `col_${bt}_003`);
      assert.strictEqual(dbUtils.sqlName(b), `col_${bt}_004`);
    });
  });
});
