const path = require('path');
const fs = require('fs');
const assert = require('assert');
const rimraf = require('rimraf');

async function run(cli) {
  const manifestPath = 'project-fixtures/react-apollo-prj/manifest.json';
  rimraf.sync(path.resolve(__dirname, '../..', manifestPath));
  const { code } = await cli.run('extract', [
    '-p',
    'project-fixtures/react-apollo-prj',
    '--verbose',
    '-o',
    manifestPath,
  ]);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../../', manifestPath)), true);
  assert.equal(code, 0);
}

module.exports = run;
