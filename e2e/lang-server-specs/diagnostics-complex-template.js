const assert = require('assert');
const path = require('path');

const { ERROR_CODES } = require('../../lib/errors');

function findResponse(responses, eventName) {
  return responses.find(response => response.event === eventName);
}

const fileContent = `
import gql from 'graphql-tag';
const fn = (msg: string) => msg;
const f = gql\`
  fragment MyFragment on Query {
    hello
  }
\`;
const q = gql\`
  \${fn(f)}
  query {
    ...MyFragment
  }
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
    assert.equal(semanticDiagEvent.body.diagnostics.length, 1);
    assert.equal(semanticDiagEvent.body.diagnostics[0].text, ERROR_CODES.templateIsTooComplex.message);
  });
}

module.exports = run;
