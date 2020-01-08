const assert = require('assert');

async function run(cli) {
  const { code: versionCode } = await cli.run('--version');
  const { code: helpCode } = await cli.run('--help');
  const { code: commandHelpCode } = await cli.run('typegen', ['--help']);
  const { code: unknownCommandCode } = await cli.run('hogehoge');
  assert.equal(versionCode, 0);
  assert.equal(helpCode, 0);
  assert.equal(commandHelpCode, 0);
  assert.equal(unknownCommandCode, 1);
}

module.exports = run;
