/**
 * A way to manage the CLI interface
 */

// Dependencies
const _ = require('lodash');
const chalk = require('chalk');
const logUpdate = require('log-update');
const logSymbols = require('log-symbols');
const spinners = require('cli-spinners');

// Main class
class UI {
  constructor(items = [], options = {}) {
    options.topPadding = options.topPadding || 1;
    options.bottomPadding = options.bottomPadding || 1;
    options.leftPadding = options.leftPadding || 1;
    options.indent = options.indent || 4;
    options.outputMethod = options.outputMethod || logUpdate.stderr;
    options.interval = options.intveral || 100;
    this.options = options;

    // Make easier refernece
    this.output = options.outputMethod;

    // Allow to attach items here
    if (items && items.length) {
      items.forEach(i => {
        this.item(i);
      });

      this.render();
    }

    // Watch for changes.
    this.update();
  }

  /**
   * Update
   */
  update() {
    if (!this.intervalUpdate && !this.options.noOutput) {
      this.intervalUpdate = setInterval(() => {
        this.render();
      }, this.options.interval);
    }
  }

  /**
   * Render
   */
  render(finish = false) {
    // Cut off render
    if (this.options.noOutput) {
      return;
    }

    // Make list
    let items = this.items.map(i => {
      return i.render();
    });

    // Make lines
    const makeLines = (lines = 1) => {
      return _.range(lines)
        .map(() => ' \n')
        .join('');
    };

    // Make columns
    const makeColumns = (columns = 1) => {
      return _.range(columns)
        .map(() => ' ')
        .join('');
    };

    // Top padding
    let output = makeLines(this.options.topPadding);

    // Items
    items.forEach(rows => {
      rows.forEach((r, ri) => {
        output += `${makeColumns(this.options.leftPadding)}${makeColumns(
          this.options.indent * (ri > 0 ? 2 : 1)
        )}${r.text}\n`;
      });
    });

    // Bottom padding
    output += makeLines(this.options.bottomPadding);

    // Output
    this.output(output);

    // Finish up or check
    if (finish) {
      this.output.done();
    }
    else {
      this.checkDone();
    }
  }

  /**
   * Add an item
   */
  item(itemConfig = {}) {
    this.items = this.items || [];

    let i;
    if (itemConfig.type === 'text') {
      i = this.text(itemConfig);
    }
    else if (itemConfig.type === 'spinner') {
      i = this.spinner(itemConfig);
    }
    else if (itemConfig.type === 'progress') {
      i = this.progress(itemConfig);
    }

    if (i) {
      this.items.push(i);
      this.render();
      return i;
    }
    else {
      throw Error(`Unable to determine type of "${itemConfig.type}"`);
    }
  }

  /**
   * Progress item
   */
  progress(config) {
    let item = {
      config,
      isDone: false
    };

    item.config.progress = item.config.progress || 0;
    item.config.progressLength = item.config.progressLength || 20;
    item.config.progressCompleteChar =
      item.config.progressCompleteChar || '\u2588';
    item.config.progressCompleteColor =
      item.config.progressCompleteColor || chalk.blue;
    item.config.progressInCompleteChar =
      item.config.progressInCompleteChar || '\u2591';
    item.config.progressInCompleteColor =
      item.config.progressInCompleteColor || chalk.blue;
    item.config.progressPrecentColor =
      item.config.progressPrecentColor || chalk.cyan;
    item.config.progressEndCap = item.config.progressEndCap || '';
    item.config.spinner = item.config.spinner || 'dots';
    item.spinnerFrame = 0;
    item.spinnerFrames = spinners[item.config.spinner].frames.length;

    item.done = newConfig => {
      item.isDone = true;
      item.update(newConfig);
    };

    item.update = newConfig => {
      item.config = _.merge(item.config, newConfig);
      item.render();
    };

    item.render = () => {
      let frame = spinners[item.config.spinner].frames[item.spinnerFrame];
      item.spinnerFrame =
        item.spinnerFrame >= item.spinnerFrames - 1 ? 0 : item.spinnerFrame + 1;
      let status = logSymbols[item.config.status || 'warning'];
      let progress = Math.floor(
        item.config.progress * item.config.progressLength
      );
      let leftover = item.config.progressLength - progress;
      let text = item.config.text
        .replace(
          '[progress]',
          `${item.config.progressEndCap}${item.config
            .progressCompleteColor(item.config.progressCompleteChar)
            .repeat(progress)}${item.config
            .progressInCompleteColor(item.config.progressInCompleteChar)
            .repeat(leftover)}${item.config.progressEndCap}`
        )
        .replace(
          '[percent]',
          item.config.progressPrecentColor(
            `${Math.round(item.config.progress * 100)}%`
          )
        );
      return [{ text: `${item.isDone ? status : frame} ${text}` }];
    };

    return item;
  }

  /**
   * Spinner item
   */
  spinner(config) {
    let item = {
      config,
      isDone: false
    };

    item.config.spinner = item.config.spinner || 'dots';
    item.spinnerFrame = 0;
    item.spinnerFrames = spinners[item.config.spinner].frames.length;

    item.done = newConfig => {
      item.isDone = true;
      item.update(newConfig);
    };

    item.update = newConfig => {
      item.config = _.merge(item.config, newConfig);
      item.render();
    };

    item.render = () => {
      let frame = spinners[item.config.spinner].frames[item.spinnerFrame];
      item.spinnerFrame =
        item.spinnerFrame >= item.spinnerFrames - 1 ? 0 : item.spinnerFrame + 1;
      let status = logSymbols[item.config.status || 'warning'];
      return [{ text: `${item.isDone ? status : frame} ${item.config.text}` }];
    };

    return item;
  }

  /**
   * Text item
   */
  text(config) {
    let item = {
      config,
      isDone: false
    };

    item.done = newConfig => {
      item.isDone = true;
      item.update(newConfig);
    };

    item.update = newConfig => {
      item.config = _.merge(item.config, newConfig);
      item.render();
    };

    item.render = () => {
      let status = logSymbols[item.config.status || 'info'];
      return [{ text: `${status} ${item.config.text}` }];
    };

    return item;
  }

  /**
   * Check done
   */
  checkDone() {
    let d = !_.find(this.items, i => {
      return i.isDone === false;
    });

    if (d) {
      this.done();
    }
  }

  /**
   * All done
   */
  done() {
    this.items.forEach(i => {
      i.done();
    });

    if (this.intervalUpdate) {
      clearInterval(this.intervalUpdate);
    }

    this.render(true);
  }
}

// Export
module.exports = UI;
