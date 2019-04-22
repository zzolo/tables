/**
 * Example config with hook for Tables
 */

module.exports = {
  hooks: {
    finish: () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 4000);
      });
    }
  }
};
