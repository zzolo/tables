/* global describe, it, before, beforeEach, after, afterEach */

// Dependencies
var assert = require('assert');
var exec = require('child_process').exec;
var path = require('path');
var fixturesPath = path.join(__dirname, './fixtures');
var commandPath = path.join(__dirname, '../bin', 'tables.js');

// Fixtures
var fixtureWithHeaders = path.join(fixturesPath, 'test-with-headers.csv');

// DB tests
describe('command line', () => {
  // Return value of command line
  describe('return value', () => {
    it('should return 0 when ok', done => {
      exec(`${commandPath} -i ${fixtureWithHeaders}`, done);
    });

    it('should return 1 when not ok', done => {
      exec(commandPath + ' -t badtype -i ' + fixtureWithHeaders, function(
        error
      ) {
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
