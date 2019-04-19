/* global describe, it, afterEach */

// Dependencies
const fs = require('fs');
const assert = require('assert');
const exec = require('child_process').exec;
const path = require('path');

// Command
const commandPath = path.join(__dirname, '../bin', 'tables.js');

// Fixtures
const fixturesPath = path.join(__dirname, './fixtures');
const fixtureWithHeaders = path.join(fixturesPath, 'test-with-headers.csv');

// AFter each remove sqlite files
afterEach(() => {
  let f = path.join(fixturesPath, 'test-with-headers.sqlite');

  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
  }
});

// DB tests
describe('command line', () => {
  // Return value of command line
  describe('return value', () => {
    it('should return 0 when ok', done => {
      exec(`${commandPath} -i ${fixtureWithHeaders} --silent`, done);
    }).timeout(4000);

    it('should return 1 when not ok', done => {
      exec(
        `${commandPath} -t badtype -i ${fixtureWithHeaders} --silent`,
        function(error) {
          if (error && error.code === 1) {
            assert.ok(true);
          }
          else {
            assert.fail(true);
          }

          done();
        }
      );
    }).timeout(4000);
  });
});
