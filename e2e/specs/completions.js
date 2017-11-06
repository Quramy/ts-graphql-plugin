const assert = require('assert');
const path = require('path');

function run(server) {
  const file = path.resolve(__dirname, '../project-fixture/main.ts');
  server.send({ command: 'open', arguments: { file, fileContent: 'const q = gql`query { ', scriptKindName: "TS" } });
  server.send({ command: 'completions', arguments: { file, offset: 22, line: 1, prefix: '' } });
  return server.close().then(() => {
    assert.equal(server.responses.length, 3);
    assert.equal(server.responses[2].body.length, 3);
    assert(server.responses[2].body.some(item => item.name === 'hello'));
  });
}

module.exports = run;
