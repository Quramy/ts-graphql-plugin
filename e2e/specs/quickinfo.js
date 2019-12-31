const assert = require('assert');
const path = require('path');

function findResponse(responses, commandName) {
  return responses.find(response => response.command === commandName);
}

async function run(server) {
  const file = path.resolve(__dirname, '../project-fixture/main.ts');
  server.send({ command: 'open', arguments: { file, fileContent: 'const q = gql`query { hello }`', scriptKindName: "TS" } });
  await server.waitEvent('projectLoadingFinish');
  server.send({ command: 'quickinfo', arguments: { file, offset: 23, line: 1 } });
  await server.waitResponse('quickinfo');
  return server.close().then(() => {
    const quickinfoResponse = findResponse(server.responses, 'quickinfo')
    assert(!!quickinfoResponse)
    assert(quickinfoResponse.body.displayString === 'Query.hello: String!');
  });
}

module.exports = run;
