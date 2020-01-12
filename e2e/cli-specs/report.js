const path = require('path');
const fs = require('fs');
const assert = require('assert');
const rimraf = require('rimraf');

async function run(cli) {
  const reportPath = 'project-fixtures/react-apollo-prj/GRAPHQL_OPERATIONS.md';
  rimraf.sync(path.resolve(__dirname, '../..', reportPath));
  const { code } = await cli.run('report', [
    '-p',
    'project-fixtures/react-apollo-prj',
    '--verbose',
    '-o',
    reportPath,
    '--includeFragments',
  ]);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../../', reportPath)), true);
  assert.equal(code, 0);
}

module.exports = run;
