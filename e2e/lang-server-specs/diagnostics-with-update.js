const assert = require('assert');
const path = require('path');
const { mark } = require('fretted-strings');

function findResponse(responses, eventName) {
  return responses.find(response => response.event === eventName);
}

async function run(server) {
  const fileFragments = path.resolve(__dirname, '../../project-fixtures/simple-prj/fragments.ts');
  const fileFragmentsContent = `
import gql from 'graphql-tag';
const f = gql\`fragment MyFragment on Query { hello }\`;
  `;

  const fileMain = path.resolve(__dirname, '../../project-fixtures/simple-prj/main.ts');
  const frets = {};
  const fileMainContent = mark(
    `
import gql from 'graphql-tag';
const q = gql\`query MyQuery { }\`;
%%%          \\               ^ %%%
%%%          \\               p %%%
  `,
    frets,
  );

  server.send({
    command: 'open',
    arguments: { file: fileFragments, fileContent: fileFragmentsContent, scriptKindName: 'TS' },
  });
  server.send({ command: 'open', arguments: { file: fileMain, fileContent: fileMainContent, scriptKindName: 'TS' } });

  await server.waitEvent('projectLoadingFinish');

  server.send({
    command: 'updateOpen',
    arguments: {
      changedFiles: [
        {
          fileName: fileMain,
          textChanges: [
            {
              newText: '...MyFragment',
              start: {
                line: frets.p.line + 1,
                offset: frets.p.character + 1,
              },
              end: {
                line: frets.p.line + 1,
                offset: frets.p.character + 1,
              },
            },
          ],
        },
      ],
    },
  });
  await server.waitResponse('updateOpen');
  server.send({ command: 'geterr', arguments: { files: [fileMain], delay: 0 } });
  await server.waitEvent('semanticDiag');
  return server.close().then(() => {
    const semanticDiagEvent = findResponse(server.responses, 'semanticDiag');
    assert(!!semanticDiagEvent);
    assert.equal(semanticDiagEvent.body.diagnostics.length, 0);
  });
}

module.exports = run;
