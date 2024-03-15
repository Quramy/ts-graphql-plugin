const assert = require('assert');

async function run(cli) {
  for (const fixtureDir of ['project-fixtures/gql-errors-prj']) {
    const { code } = await cli.run('validate', ['-p', fixtureDir, '--verbose']);
    assert.equal(code, 1);
  }

  for (const fixtureDir of ['project-fixtures/react-apollo-prj', 'project-fixtures/graphql-codegen-prj']) {
    const { code } = await cli.run('validate', ['-p', fixtureDir, '--verbose']);
    assert.equal(code, 0);
  }
}

module.exports = run;
