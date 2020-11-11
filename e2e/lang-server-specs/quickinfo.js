const assert = require('assert');
const path = require('path');
const { mark } = require('fretted-strings');

function findResponse(responses, commandName) {
  return responses.find(response => response.command === commandName);
}

async function run(server) {
  const file = path.resolve(__dirname, '../../project-fixtures/simple-prj/main.ts');
  const frets = {};
  const fileContent = mark(
    `
    const q = gql\`query {
      hello
%%%   ^                   %%%
%%%   p                   %%%
    }
  `,
    frets,
  );
  server.send({
    command: 'open',
    arguments: { file, fileContent, scriptKindName: 'TS' },
  });
  await server.waitEvent('projectLoadingFinish');
  server.send({ command: 'quickinfo', arguments: { file, offset: frets.p.character + 1, line: frets.p.line + 1 } });
  await server.waitResponse('quickinfo');
  return server.close().then(() => {
    const quickinfoResponse = findResponse(server.responses, 'quickinfo');
    assert(!!quickinfoResponse);
    assert(quickinfoResponse.body.displayString === 'Query.hello: String!');
  });
}

module.exports = run;
