#! /usr/bin/env node

/**
 * A bare-bones way of paging through an API and turning into ndjson
 */

// Dependencies
const command = require('commander');
const objPath = require('object-path');
const fetch = require('node-fetch');
const debug = require('debug')('api-pager');

// Basic command line parts
command
  .description('Basic way to page through an API call and turning into ndjson')
  .version('x');

// Options
command.option(
  '-u, --uri [uri]',
  'URI using token [[page]] to for page number.'
);
command.option(
  '-r, --results [json-path]',
  'Path in response to results array.'
);
command.option('-p, --page [json-path]', 'Path in response to current page.');
command.option('-t, --pages [json-path]', 'Path in response to total pages.');

// Parse
command.parse(process.argv);

// Make call
async function makeCall(page = 1) {
  let response = await fetch(command.uri.replace('[[page]]', page));
  let data = await response.json();

  return {
    page: objPath.get(data, command.page),
    pages: objPath.get(data, command.pages),
    results: objPath.get(data, command.results)
  };
}

async function sleep(t = 100) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, t);
  });
}

// Go
async function main() {
  let stillPages = true;
  let currentPage = 1;

  while (stillPages) {
    let { page, pages, results } = await makeCall(currentPage);
    debug(`Page: ${page} | Pages: ${pages} | Results: ${results.length}`);
    stillPages = page < pages;

    results.forEach(r => {
      process.stdout.write(JSON.stringify(r));
      process.stdout.write('\n');
    });

    currentPage++;
    await sleep();
  }
}

main();
