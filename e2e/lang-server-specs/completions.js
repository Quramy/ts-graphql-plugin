const assert = require('assert');
const path = require('path');

function findResponse(responses, commandName) {
  return responses.find(response => response.command === commandName);
}

async function run(server) {
  const file = path.resolve(__dirname, '../../project-fixtures/simple-prj/main.ts');
  server.send({ command: 'open', arguments: { file, fileContent: 'const q = gql`query { ', scriptKindName: 'TS' } });
  await server.waitEvent('projectLoadingFinish');
  server.send({ command: 'completions', arguments: { file, offset: 22, line: 1, prefix: '' } });
  await server.waitResponse('completions');
  return server.close().then(() => {
    const completionsResponse = findResponse(server.responses, 'completions');
    assert(!!completionsResponse);
    assert(completionsResponse.body.some(item => item.name === 'hello'));
  });
}

module.exports = run;
