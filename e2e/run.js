const path = require('path');
const glob = require('glob');
const createServer = require('./fixtures/lang-server');
const createCLI = require('./fixtures/cli');

async function runLangServerSpecs() {
  const langServerSpecFiles = glob.sync('lang-server-specs/*.js', { cwd: __dirname });
  console.log('Start lang server e2e testing.');
  let server;
  await langServerSpecFiles.reduce(
    (queue, file) =>
      queue.then(() => require(path.join(__dirname, file))((server = createServer())).then(() => server.close())),
    Promise.resolve(null),
  );
  console.log(`🌟  ${langServerSpecFiles.length} lang server specs were passed.`);
  console.log('');
}

async function runCliSpecs() {
  const cliSpecFiles = glob.sync('cli-specs/*.js', { cwd: __dirname });
  console.log('Start CLI e2e testing.');
  await cliSpecFiles.reduce(
    (queue, file) => queue.then(() => require(path.resolve(__dirname, file))(createCLI())),
    Promise.resolve(),
  );
  console.log(`🌟  ${cliSpecFiles.length} CLI specs were passed.`);
  console.log('');
}

async function runWebpackSpecs() {
  const webpackSpecFiles = glob.sync('webpack-specs/*.js', { cwd: __dirname });
  console.log('Start webpack e2e testing.');
  await webpackSpecFiles.reduce(
    (queue, file) => queue.then(() => require(path.resolve(__dirname, file))()),
    Promise.resolve(),
  );
  console.log(`🌟  ${webpackSpecFiles.length} webpack specs were passed.`);
  console.log('');
}

const suitesMap = {
  'lang-server': [runLangServerSpecs],
  cli: [runCliSpecs],
  webpack: [runWebpackSpecs],
  all: [runLangServerSpecs, runCliSpecs, runWebpackSpecs],
};

async function run(suiteName) {
  try {
    const suites = suitesMap[suiteName] || suitesMap.all;
    await suites.reduce((queue, suite) => queue.then(() => suite()), Promise.resolve());
  } catch (reason) {
    console.log('😢  some specs were failed...');
    console.error(reason);
    process.exit(1);
  }
}

const suiteName = process.argv.slice(2)[0];

run(suiteName);
