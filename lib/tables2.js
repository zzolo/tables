/**
 * Main Tables class
 */

// Depenencies
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const merge = require('merge2');
const _ = require('lodash');
const tito = require('tito');
const Sequelize = require('sequelize');
const replaceExt = require('replace-ext');
const debug = require('debug')('tables');
const dbUtils = require('./utils-db');
const guessModel = require('./guess-model');
const autoTransform = require('./auto-transform');

/**
 * Tables class
 */
class Tables {
  constructor(options = {}) {
    // Default options
    this.options = _.defaultsDeep({}, options, {
      formats: tito.formats.names,
      batch: 500,
      guess: 300,
      transactions: true,
      dateFormat: ['MM/DD/YYYY', 'YYYY-MM-DD'],
      datetimeFormat: ['MM/DD/YYYY HH:mm:ss a'],
      dbOptions: {
        logging: false,
        define: {
          timestamps: false
        },
        pool: {
          maxIdleTime: 10000
        },
        dialectOptions: {
          multipleStatements: true
        }
      }
    });

    // Setup and validate
    this.setup();
    this.validate();

    // Allow chain
    return this;
  }

  /**
   * Setup; fill in any missing options.
   */
  setup() {
    // Look at input to determine format if needed
    if (!this.options.format && _.isString(this.options.input)) {
      this.options.format = _.find(this.options.format, f => {
        return this.options.input.match(new RegExp(`${f}$`, 'i'));
      });
    }

    // Default to CSV
    this.options.format = this.options.format || 'csv';

    // Format option defaults for types
    let defaultFormatOptions = {
      csv: {
        delimiter: ',',
        quote: '"',
        headers: true,
        ignoreEmpty: true
      },
      json: { path: '*' }
    };
    this.options.formatOptions = _.defaultsDeep(
      {},
      this.options.formatOptions || {},
      defaultFormatOptions[this.options.format] || {}
    );

    // Use input for id if not provided
    this.options.id =
      this.options.id ||
      this.options.input ||
      `tables-id-${Math.round(Math.random() * 1000000)}`;

    // Allow db to from encironment variable
    this.options.db = this.options.db ? this.options.db : process.env.TABLES_DB;

    // Mark as piped data
    this.options.pipe =
      this.options.pipe === true
        ? !this.options.input && !process.stdin.isTTY
        : false;

    // If db is not defined and input
    if (!this.options.db && this.options.input && !this.options.pipe) {
      this.options.db = `sqlite://${replaceExt(this.options.input, '.sqlite')}`;
    }

    // Use name of file for table name if not given
    if (!this.options.tableName && this.options.input) {
      this.options.tableName = _.snakeCase(
        path.basename(this.options.input).replace(/\.[^/.]+$/, '')
      );
    }
  }

  /**
   * Validate options
   */
  validate() {
    // Make sure db option is set
    if (!this.options.db) {
      throw new Error(
        '"options.db" database URI is necessary for Tables to run.  If not using piped data, Tables will default to an SQLite database with the same '
      );
    }

    // If input is not set, assume pipe-in
    if (!this.options.input && !this.options.pipe) {
      throw new Error(
        'If not piping in data, "options.input" option is required and should be a path to a file.'
      );
    }

    // Check that input exists
    if (this.options.input && !fs.existsSync(this.options.input)) {
      throw new Error('"options.input" file path given but does not exist.');
    }

    // Check format
    if (
      !(
        ~this.options.formats.indexOf(this.options.format) ||
        _.isFunction(this.options.format)
      )
    ) {
      throw new Error(
        `"options.format" provided, '${
          this.options.format
        }', not supported; should be one of ${this.options.formats.join(
          ', '
        )} or a function that returns a stream transformer.`
      );
    }
  }

  /**
   * Main function to load data.
   */
  async start() {
    // DB
    this.db = new Sequelize(this.options.db, this.options.dbOptions);

    // Check database connection
    await this.db.authenticate();

    // Setup input stream
    this.input = this.getInputStream();

    // Guess model and recreate pipe with the data we used
    if (!this.options.models) {
      let { model, inputCollected, pipeExahusted } = await this.guessModel();
      this.options.models = {
        [model.modelName]: model
      };

      // Create new stream of our guess data
      let inputUsed = new PassThrough();

      // Replace if ended
      if (pipeExahusted) {
        this.input = inputUsed;
      }
      else {
        let temp = merge([inputUsed, this.input]);
        this.input = temp;
      }

      inputUsed.end(Buffer.concat(inputCollected));
    }

    // Sync models
    await this.db.sync({ force: this.options.deleteTable });

    // Extractor
    this.extractor = this.getExtractor();

    // Transformer
    this.transformer = this.getTransformer();

    // Loader
    this.loader = this.getLoader();

    // Setup input handler, mostly for meta data
    this.input.on('data', d => {
      // TODO
    });

    // Input done
    this.input.on('finish', () => {
      debug('input finish');
    });
    this.input.on('end', () => {
      debug('input end');
    });

    // Setup extrator handler
    this.extractor.on('data', async d => {
      let t = this.transformer(d, this.options.models, this.options);
      await this.loader(t, this.input, this.extractor, this.options);
    });

    // Extractor done
    this.extractor.on('finish', async () => {
      debug('extractor finish');
      await this.loader(null, this.input, this.extractor, this.options, true);
      await this.finish();
    });

    // Start piping
    this.input.pipe(this.extractor);
  }

  /**
   * All done
   */
  async finish() {
    await this.db.close();
    debug('db connection closed');
  }

  /**
   * Setup streams
   */
  getInputStream() {
    // If pipe, use that
    if (this.options.pipe) {
      return process.stdin;
    }
    else {
      // TODO: Handle resume
      let streamOptions = {};
      //options.start = parsedByteCount = info.current;
      //options.end = info.total;
      return fs.createReadStream(this.options.input, streamOptions);
    }
  }

  /**
   * Make pipable extractor
   */
  getExtractor() {
    if (_.isFunction(this.options.format)) {
      return _.bind(this.options.format, this)(this.options.formatOptions);
    }

    return tito.formats.createReadStream(
      this.options.format,
      this.options.formatOptions
    );
  }

  /**
   * Get transformer
   */
  getTransformer() {
    return this.options.transformer || autoTransform;
  }

  /**
   * Make loader method
   */
  getLoader() {
    return this.options.loader || this.batchLoader;
  }

  /**
   * Batch loader.  Mostly used for testing purposes
   */
  async batchLoader(
    transformed,
    inputPipe,
    extractorPipe,
    tablesOptions = {},
    finished = false
  ) {
    // Collected
    this.batchLoaderBin = this.batchLoaderBin || [];
    if (transformed) {
      this.batchLoaderBin.push(transformed);
    }

    // Check size
    if (!finished && this.batchLoaderBin.length < this.options.batch) {
      return;
    }

    // Pause
    inputPipe.pause();
    extractorPipe.pause();

    // Expand the bin by each model
    let binByModel = {};
    this.batchLoaderBin.forEach(b => {
      _.each(b, (d, m) => {
        binByModel[m] = binByModel[m] || [];
        binByModel[m].push(d);
      });
    });

    // Go through each model and bulkUpsert
    for (let m in binByModel) {
      let Model = this.options.models[m];
      if (Model) {
        await dbUtils.bulkUpsert(binByModel[m], Model, tablesOptions);
      }
    }

    // Clear bin
    this.batchLoaderBin = [];

    // Resume
    extractorPipe.resume();
    inputPipe.resume();
  }

  /**
   * Single loader.  Mostly used for testing purposes
   */
  async singleLoader(transformed, inputPipe, extractorPipe) {
    if (!transformed) {
      return;
    }

    // Pause
    inputPipe.pause();
    extractorPipe.pause();

    // Go through each model and upsert
    for (let m in transformed) {
      let Model = this.options.models[m];
      if (Model) {
        await Model.upsert(transformed[m]);
      }
    }

    // Resume
    extractorPipe.resume();
    inputPipe.resume();
  }

  /**
   * Guess model.  Use the piped data to guess model
   */
  guessModel() {
    // Use Promise so that we can get values from callbacks/events
    return new Promise((resolve, reject) => {
      let dataCount = 0;
      let dataCollected = [];
      let inputCollected = [];
      let guessingExtractor = this.getExtractor();
      let input = this.input;

      // When done
      const done = (pipeExahusted = false) => {
        // Stop everything
        input.pause();
        input.unpipe(guessingExtractor);
        guessingExtractor.removeAllListeners('data');

        resolve({
          inputCollected,
          pipeExahusted,
          model: guessModel(dataCollected, this.options, this.db)
        });
      };

      // Collect data for guessing model
      guessingExtractor.on('data', d => {
        dataCollected.push(d);
        dataCount++;

        if (dataCount >= this.options.guess) {
          guessingExtractor.pause();
          done();
        }
      });

      // Collect input buffer to reconnect stream afterward
      input.on('data', d => {
        inputCollected.push(d);
      });

      // If pipe finishes, we'll have to do a bit different to put pipe
      // back together
      guessingExtractor.on('finish', () => {
        done(true);
      });
      guessingExtractor.on('destroy', () => {
        done(true);
      });
      guessingExtractor.on('end', () => {
        done(true);
      });

      // Error
      guessingExtractor.on('error', reject);

      // Pipe
      input.pipe(guessingExtractor);
    });
  }
}

let t = new Tables({
  db: 'postgres://palazad:@localhost:5432/tables',
  input: 'examples/nyc-water-quality-complaints.csv',
  key: 'uniqueKey',
  deleteTable: true
});
t.start();

// Export
module.exports = {
  Tables,
  tables: options => new Tables(options)
};
