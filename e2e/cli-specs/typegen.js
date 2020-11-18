const assert = require('assert');
const fs = require('fs');
const rimraf = require('rimraf');

async function run(cli) {
  const { code: code0 } = await cli.run('typegen', ['-p', 'project-fixtures/react-apollo-prj', '--verbose']);
  assert.equal(code0, 0);

  const { code: code1 } = await cli.run('typegen', ['-p', 'project-fixtures/gql-errors-prj', '--verbose']);
  assert.equal(code1, 1);

  rimraf.sync('project-fixtures/typegen-addon-prj/__generated__/**');
  const { code: code2 } = await cli.run('typegen', ['-p', 'project-fixtures/typegen-addon-prj', '--verbose']);
  assert.equal(code2, 0);
  assert(fs.existsSync(__dirname + '/../../project-fixtures/typegen-addon-prj/__generated__/my-query.ts'));
  assert(fs.existsSync(__dirname + '/../../project-fixtures/typegen-addon-prj/__generated__/post-fragment.ts'));
}

module.exports = run;
