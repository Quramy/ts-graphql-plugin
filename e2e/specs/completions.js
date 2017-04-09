const assert = require('assert');

function run(server) {
  server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'const q = gql`query { ', scriptKindName: "TS" } });
  server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 22, line: 1, prefix: '' } });
  return server.close().then(() => {
    assert.equal(server.responses.length, 2);
    assert.equal(server.responses[1].body.length, 3);
    assert(server.responses[1].body.some(item => item.name === 'hello'));
  });
}

module.exports = run;
