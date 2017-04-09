const createServer = require('./server-fixture');
const path = require('path');
const glob = require('glob');

function run() {
  const files = glob.sync('specs/*.js', {
    cwd: __dirname,
  });
  const specs = files.reduce((queue, file) => {
    try {
      const spec = require(path.join(__dirname, file));
      const server = createServer();
      return queue
        .then(() => spec(server))
        .then(() => server.close());
      ;
    } catch (e) {
      console.error(`${file} is server spec`);
      return Promise.reject(e);
    }
  }, Promise.resolve(null));
  specs.then(() => {
    console.log(`success ${files.length} specs.`);
  }).catch(reason => {
    console.log('fail');
    console.error(reason);
  });
}

run();
