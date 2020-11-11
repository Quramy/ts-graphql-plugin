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
%%%          \\       ^ %%%
%%%          \\       p %%%
  `,
    frets,
  );
  server.send({ command: 'open', arguments: { file, fileContent, scriptKindName: 'TS' } });
  await server.waitEvent('projectLoadingFinish');
  server.send({
    command: 'completions',
    arguments: { file, offset: frets.p.character + 1, line: frets.p.line + 1, prefix: '' },
  });
  await server.waitResponse('completions');
  return server.close().then(() => {
    const completionsResponse = findResponse(server.responses, 'completions');
    assert(!!completionsResponse);
    assert(completionsResponse.body.some(item => item.name === 'hello'));
  });
}

module.exports = run;
