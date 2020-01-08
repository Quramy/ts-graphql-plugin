const path = require('path');
const glob = require('glob');
const createServer = require('./fixtures/lang-server');
const createCLI = require('./fixtures/cli');

async function run() {
  const langServerSpecFiles = glob.sync('lang-server-specs/*.js', { cwd: __dirname });
  const cliSpecFiles = glob.sync('cli-specs/*.js', { cwd: __dirname });
  try {
    console.log('Start lang server e2e testing.');
    let server;
    await langServerSpecFiles.reduce(
      (queue, file) =>
        queue.then(() => require(path.join(__dirname, file))((server = createServer())).then(() => server.close())),
      Promise.resolve(null),
    );
    console.log(`🌟  ${langServerSpecFiles.length} lang server specs were passed.`);
    console.log('');
    console.log('Start CLI e2e testing.');
    await cliSpecFiles.reduce(
      (queue, file) => queue.then(() => require(path.resolve(__dirname, file))(createCLI())),
      Promise.resolve(),
    );
    console.log(`🌟  ${cliSpecFiles.length} CLI specs were passed.`);
  } catch (reason) {
    console.log('😢  some specs were failed...');
    console.error(reason);
    process.exit(1);
  }
}

run();
