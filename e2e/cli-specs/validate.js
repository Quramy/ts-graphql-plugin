const assert = require('assert');

async function run(cli) {
  const { code } = await cli.run('validate', ['-p', 'project-fixtures/gql-syntax-error', '--verbose']);
  assert.equal(code, 1);
}

module.exports = run;
