const path = require('path');
const { fork } = require('child_process');

class CLI {
  async run(commandName, options = []) {
    console.log('');
    console.log(`*** run: ts-graphql-plugin ${commandName} ${options.join(' ')} ***`);
    const process = fork(path.resolve(__dirname, '../../lib/cli/cli'), [commandName, ...options], {
      cwd: path.join(__dirname, '../..'),
    });
    return new Promise(res => {
      console.log('');
      process.on('exit', code => res({ code }));
    });
  }
}

function createCLI() {
  return new CLI();
}

module.exports = createCLI;
