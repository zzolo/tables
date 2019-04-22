/**
 * Main Tables class
 */

// Depenencies
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const chalk = require('chalk');
const merge = require('merge2');
const _ = require('lodash');
const tito = require('tito');
const Sequelize = require('sequelize');
const replaceExt = require('replace-ext');
const debug = require('debug')('tables');
const dbUtils = require('./utils-db');
const guessModel = require('./guess-model');
const autoTransform = require('./auto-transform');
const UI = require('./ui');

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
      overwrite: false,
      transactions: true,
      optimize: true,
      silent: false,
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
      },
      defaultDb: 'sqlite://tables-import.sqlite'
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
    this.options.db = this.options.db
      ? this.options.db
      : process.env.TABLES_DB_URI;

    // Mark as piped data
    this.options.pipe =
      !this.options.input && !process.stdin.isTTY ? true : false;

    // If db is not defined and input
    if (!this.options.db && this.options.input && !this.options.pipe) {
      this.options.db = `sqlite://${replaceExt(this.options.input, '.sqlite')}`;
    }
    // Otherwise, just make generic file
    else if (!this.options.db) {
      this.options.db = this.options.defaultDb;
    }

    // Get parts of db
    this.dbParts = dbUtils.parseUri(this.options.db);

    // Use name of file for table name if not given
    if (!this.options.tableName && this.options.input) {
      this.options.tableName = path
        .basename(this.options.input)
        .replace(/\.[^/.]+$/, '');
    }

    // Make sure we have a table name
    this.options.tableName = this.options.tableName || 'tables_auto_import';

    // Format table name for SQL
    this.options.tableName = dbUtils.sqlName(this.options.tableName, 'table');

    // Mark as guessing
    this.options.guessModels = !this.options.models;

    // Add outputer
    this.ui = this.getUi();
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

    // Check that models is a function
    if (this.options.models && !_.isFunction(this.options.models)) {
      throw new Error('"models" options provided is not a function.');
    }

    // Check that transformer is a function
    if (this.options.transformer && !_.isFunction(this.options.transformer)) {
      throw new Error('"transformer" options provided is not a function.');
    }
  }

  /**
   * Main function to load data.
   */
  async start() {
    // Explicitly wrap in Promise, as we are using pipes and async
    // won't be able to know when those are finished.
    return new Promise(async (resolve, reject) => {
      // Check database connection
      try {
        this.db = new Sequelize(this.options.db, this.options.dbOptions);
        await this.db.authenticate();

        this.ui._dbConnect.done({
          status: 'success',
          text: this.ui._dbConnect._text('Connected to')
        });
      }
      catch (e) {
        this.ui._dbConnect.done({
          status: 'error',
          text: this.ui._dbConnect._text('Problem connecting to', e.toString())
        });
        debug(e);
        await this.fail(e);
        return reject(e);
      }

      // Setup input stream
      try {
        this.input = this.getInputStream();

        this.ui._inputStream.done({
          status: 'success',
          text: this.ui._inputStream._text('Connected to')
        });
      }
      catch (e) {
        this.ui._inputStream.done({
          status: 'error',
          text: this.ui._inputStream._text(
            'Problem connecting to',
            e.toString()
          )
        });
        debug(e);
        await this.fail(e);
        return reject(e);
      }

      // Guess model and recreate pipe with the data we used
      if (this.options.guessModels) {
        try {
          let _tablesStats = this.input._tablesStats;
          let {
            model,
            inputCollected,
            pipeExahusted
          } = await this.guessModel();
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
          this.input._tablesStats = _tablesStats;

          this.ui._guessModel.done({
            status: 'success',
            text: this.ui._guessModel._text('Guessed')
          });
        }
        catch (e) {
          this.ui._guessModel.done({
            status: 'error',
            text: this.ui._guessModel._text('Problem guessing', e.toString())
          });
          debug(e);
          await this.fail(e);
          return reject(e);
        }
      }
      else {
        // Get models
        this.options.models = _.bind(this.options.models, this)(
          this.db,
          Sequelize,
          this.options
        );
      }

      // Sync models
      try {
        await this.db.sync({ force: this.options.overwrite });

        if (this.options.optimize) {
          for (let m in this.options.models) {
            await dbUtils.optimize(this.options.models[m]);
          }
        }

        this.ui._syncModels.done({
          status: 'success',
          text: this.ui._syncModels._text('Setup')
        });
      }
      catch (e) {
        this.ui._syncModels.done({
          status: 'error',
          text: this.ui._syncModels._text('Problem setting up', e.toString())
        });
        debug(e);
        await this.fail(e);
        return reject(e);
      }

      // Extractor
      this.extractor = this.getExtractor();

      // Transformer
      this.transformer = this.getTransformer();

      // Loader
      this.loader = this.getLoader();

      // Input data, mostly for tracking progress
      this.inputBytes = 0;
      this.input.on('data', d => {
        this.inputBytes += d.length;
        this.ui._input.update({
          progress:
            this.input._tablesStats && this.input._tablesStats.size
              ? this.inputBytes / this.input._tablesStats.size
              : 0
        });
      });

      // Input done
      this.input.on('end', () => {
        debug('input end');
        this.ui._input.done({
          status: 'success',
          text: this.ui._input._text('Extracted')
        });
      });

      // Input error
      this.input.on('error', async e => {
        this.ui._input.done({
          status: 'error',
          text: this.ui._input._text('Problem extracting', e.toString())
        });
        debug(e);
        await this.fail(e);
        return reject(e);
      });

      // Setup extrator handler
      this.extractor.on('data', async d => {
        let t = this.transformer(d, this.options.models, this.options);
        let rows = await this.loader(
          t,
          this.input,
          this.extractor,
          this.options
        );

        this.ui._loading.update({
          text: this.ui._loading._text('Loaded', rows.toLocaleString())
        });
      });

      // Extractor done
      this.extractor.on('end', async () => {
        debug('extractor end');
        let rows = await this.loader(
          null,
          this.input,
          this.extractor,
          this.options,
          true
        );

        this.ui._loading.done({
          status: 'success',
          text: this.ui._loading._text('Loaded', rows.toLocaleString())
        });

        try {
          await this.finish();
        }
        catch (e) {
          await this.fail(e);
          return reject(e);
        }

        resolve(this);
      });

      // Extractor error
      this.extractor.on('error', async e => {
        this.ui._loading.done({
          status: 'error',
          text: this.ui._loading._text('Problem loading', '', e.toString())
        });
        debug(e);
        await this.fail(e);
        return reject(e);
      });

      // Start piping
      this.input.pipe(this.extractor);
    });
  }

  /**
   * Fail state
   */
  async fail() {
    if (this.db) {
      await this.db.close();
    }

    if (this.ui) {
      this.ui.done();
    }

    process.exit(1);
  }

  /**
   * All done
   */
  async finish() {
    // Run finish hook
    try {
      await this.runHook('finish');
      if (this.ui._hooksFinish) {
        this.ui._hooksFinish.done({
          status: 'success',
          text: this.ui._hooksFinish._text('Ran')
        });
      }
    }
    catch (e) {
      if (this.ui._hooksFinish) {
        this.ui._hooksFinish.done({
          status: 'error',
          text: this.ui._hooksFinish._text('Problem running', e.toString())
        });
      }
      debug(e);
      throw e;
    }

    // Optimize
    if (this.options.optimize) {
      try {
        for (let m in this.options.models) {
          await dbUtils.optimize(this.options.models[m]);
        }
        this.ui._optimize.done({
          status: 'success',
          text: this.ui._optimize._text('Optimized')
        });
      }
      catch (e) {
        this.ui._optimize.done({
          status: 'error',
          text: this.ui._optimize._text('Problem optimizing', e.toString())
        });
        debug(e);
        throw e;
      }
    }

    await this.db.close();
    this.ui.done();
  }

  /**
   * Setup UI
   */
  getUi() {
    let ui = new UI([], {
      noOutput: this.options.silent
    });

    // Overwrite
    if (this.options.overwrite) {
      ui._overwrite = ui.item({
        type: 'text',
        status: 'warning',
        text: `${chalk.yellow(
          'Overwrite'
        )} option used, data and tables will be deleted before loading data.`
      });
    }

    // DB connection
    let dbConnectText = (action = 'Connecting to', error) =>
      `${action} ${chalk.magenta(
        this.dbParts.dbProtocol
      )} database: ${chalk.cyan(this.dbParts.db)} ${
        error ? '[' + chalk.red(error) + ']' : ''
      }`;

    ui._dbConnect = ui.item({
      type: 'spinner',
      text: dbConnectText()
    });
    ui._dbConnect._text = dbConnectText;

    // Input stream connection
    let inputStreamText = (action = 'Connecting to', error) =>
      `${action} input ${chalk.magenta(
        this.options.pipe ? 'pipe' : 'file'
      )}: ${chalk.cyan(this.options.input || 'stdin')} ${
        error ? '[' + chalk.red(error) + ']' : ''
      }`;

    ui._inputStream = ui.item({
      type: 'spinner',
      text: inputStreamText()
    });
    ui._inputStream._text = inputStreamText;

    // Guess model
    if (this.options.guessModels) {
      let guessModelText = (action = 'Guessing', error) =>
        `${action} model from first ${chalk.cyan(
          this.options.guess
        )} rows of data ${error ? '[' + chalk.red(error) + ']' : ''}`;

      ui._guessModel = ui.item({
        type: 'spinner',
        text: guessModelText()
      });
      ui._guessModel._text = guessModelText;
    }

    // Sync models
    let syncModelsText = (action = 'Setting up', error) =>
      `${action} tables: ${_.map(
        this.options.models,
        m => `${chalk.cyan(m.tableName)} (${_.size(m.tableAttributes)} cols)`
      ).join(', ')} ${error ? '[' + chalk.red(error) + ']' : ''}`;

    ui._syncModels = ui.item({
      type: 'spinner',
      text: syncModelsText()
    });
    ui._syncModels._text = syncModelsText;

    // Input/extraction
    let inputText = (action = 'Extracting', error) =>
      (this.options.pipe ? '' : '[progress] [percent] ') +
      `${action} ${chalk.magenta(this.options.format)} data ${
        error ? '[' + chalk.red(error) + ']' : ''
      }`;

    ui._input = ui.item({
      type: this.options.pipe ? 'spinner' : 'progress',
      text: inputText()
    });
    ui._input._text = inputText;

    // DB loading
    let loadingText = (action = 'Loading', rows = 0, error) =>
      `${action} ${rows ? chalk.cyan(rows) : ''} rows into database ${
        error ? '[' + chalk.red(error) + ']' : ''
      }`;

    ui._loading = ui.item({
      type: 'spinner',
      text: loadingText()
    });
    ui._loading._text = loadingText;

    // Finish hook
    if (this.options.hooks && this.options.hooks.finish) {
      let hooksFinishText = (action = 'Running', error) =>
        `${action} ${chalk.cyan('finish hook')} ${
          error ? '[' + chalk.red(error) + ']' : ''
        }`;

      ui._hooksFinish = ui.item({
        type: 'spinner',
        text: hooksFinishText()
      });
      ui._hooksFinish._text = hooksFinishText;
    }

    // Optimize
    if (this.options.optimize) {
      let optimizeText = (action = 'Optimizing', error) =>
        `${action} database tables ${
          error ? '[' + chalk.red(error) + ']' : ''
        }`;

      ui._optimize = ui.item({
        type: 'spinner',
        text: optimizeText()
      });
      ui._optimize._text = optimizeText;
    }

    return ui;
  }

  /**
   * Run hook
   */
  async runHook(name, ...args) {
    if (
      this.options.hooks &&
      this.options.hooks[name] &&
      _.isFunction(this.options.hooks[name])
    ) {
      await _.bind(this.options.hooks[name], this)(
        this.db,
        this.options.models,
        this.options,
        ...args
      );
    }
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
      let stats = fs.statSync(this.options.input);

      // TODO: Handle resume
      let streamOptions = {};
      //options.start = parsedByteCount = info.current;
      //options.end = info.total;

      let s = fs.createReadStream(this.options.input, streamOptions);
      s._tablesStats = stats;
      return s;
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
   * Get transformer.  If guessed model, run through both transformer
   * and auto Transform
   */
  getTransformer() {
    return _.bind(
      this.options.guessModels && this.options.transformer
        ? (...a) =>
          autoTransform(
            this.options.transformer(...a),
            ..._.filter(a, (d, di) => di !== 0)
          )
        : this.options.transformer || autoTransform,
      this
    );
  }

  /**
   * Make loader method
   */
  getLoader() {
    return _.bind(this.options.loader || this.batchLoader, this);
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
    // Row count
    this.loaderRowCount = _.isNumber(this.loaderRowCount)
      ? this.loaderRowCount
      : 0;

    // Collected
    this.batchLoaderBin = this.batchLoaderBin || [];
    if (transformed) {
      this.batchLoaderBin.push(transformed);
    }

    // Check size
    if (!finished && this.batchLoaderBin.length < this.options.batch) {
      return this.loaderRowCount;
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
        this.loaderRowCount += binByModel[m].length;
      }
    }

    // Clear bin
    this.batchLoaderBin = [];

    // Resume
    extractorPipe.resume();
    inputPipe.resume();

    return this.loaderRowCount;
  }

  /**
   * Single loader.  Mostly used for testing purposes
   */
  async singleLoader(transformed, inputPipe, extractorPipe) {
    // Row count
    this.loaderRowCount = _.isNumber(this.loaderRowCount)
      ? this.loaderRowCount
      : 0;

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
        this.loaderRowCount++;
      }
    }

    // Resume
    extractorPipe.resume();
    inputPipe.resume();

    return this.loaderRowCount;
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

      // If there is a transformer (and not a model) then we use that
      // for our data to guess model
      let transformer = this.options.transformer
        ? d => this.options.transformer(d, undefined, this.options)
        : d => d;

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
        dataCollected.push(transformer(d));
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

// Export
module.exports = {
  Tables,
  tables: options => new Tables(options)
};
