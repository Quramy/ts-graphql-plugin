const assert = require('assert');

async function run(cli) {
  const { code: code0 } = await cli.run('typegen', ['-p', 'project-fixtures/react-apollo-prj', '--verbose']);
  assert.equal(code0, 0);

  const { code: code1 } = await cli.run('typegen', ['-p', 'project-fixtures/gql-errors-prj', '--verbose']);
  assert.equal(code1, 1);
}

module.exports = run;
