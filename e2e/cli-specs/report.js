const path = require('path');
const fs = require('fs');
const assert = require('assert');
const rimraf = require('rimraf');

async function run(cli) {
  const fixtureDirs = ['project-fixtures/graphql-codegen-prj', 'project-fixtures/react-apollo-prj'];
  for (const fixtureDir of fixtureDirs) {
    const reportPath = `${fixtureDir}/GRAPHQL_OPERATIONS.md`;
    rimraf.sync(path.resolve(__dirname, '../..', reportPath));
    const { code } = await cli.run('report', ['-p', fixtureDir, '--verbose', '-o', reportPath, '--includeFragments']);
    assert.equal(fs.existsSync(path.resolve(__dirname, '../../', reportPath)), true);
    assert.equal(code, 0);
  }
}

module.exports = run;
