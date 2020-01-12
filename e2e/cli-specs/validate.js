const assert = require('assert');

async function run(cli) {
  const { code } = await cli.run('validate', ['-p', 'project-fixtures/gql-errors-prj', '--verbose']);
  assert.equal(code, 1);
}

module.exports = run;
