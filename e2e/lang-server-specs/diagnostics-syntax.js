const assert = require('assert');
const path = require('path');

function findResponse(responses, eventName) {
  return responses.find(response => response.event === eventName);
}

const fileContent = `
import gql from 'graphql-tag';
const q = gql\`
\`;
`;

async function run(server) {
  const file = path.resolve(__dirname, '../../project-fixtures/simple-prj/main.ts');
  server.send({ command: 'open', arguments: { file, fileContent, scriptKindName: 'TS' } });
  await server.waitEvent('projectLoadingFinish');
  server.send({ command: 'geterr', arguments: { files: [file], delay: 0 } });
  await server.waitEvent('semanticDiag');
  return server.close().then(() => {
    const semanticDiagEvent = findResponse(server.responses, 'semanticDiag');
    assert(!!semanticDiagEvent);
    assert.strictEqual(semanticDiagEvent.body.diagnostics.length, 1);
    assert.strictEqual(semanticDiagEvent.body.diagnostics[0].text, 'Syntax Error: Unexpected <EOF>.');
  });
}

module.exports = run;
