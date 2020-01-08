const assert = require('assert');

async function run(cli) {
  const { code } = await cli.run('typegen', ['-p', 'project-fixtures/react-apollo-prj', '--verbose']);
  assert.equal(code, 0);
}

module.exports = run;
