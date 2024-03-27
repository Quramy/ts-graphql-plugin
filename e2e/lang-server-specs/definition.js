const assert = require('assert');
const path = require('path');
const { mark } = require('fretted-strings');

function findResponse(responses, commandName) {
  return responses.find(response => response.command === commandName);
}

async function run(server) {
  const fileFragments = path.resolve(__dirname, '../../project-fixtures/simple-prj/fragments.ts');
  const fileMain = path.resolve(__dirname, '../../project-fixtures/simple-prj/main.ts');
  const frets = {};
  const fileFragmentsContent = `
    const fragment = gql\`
      fragment MyFragment on Query {
        hello
      }
    \`;
  `;
  const fileMainContent = mark(
    `
      const query = gql\`
        query MyQuery {
          ...MyFragment
 %%%          ^           %%%
 %%%          p           %%%
        }
      \`;
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
    command: 'definition',
    arguments: { file: fileMain, offset: frets.p.character + 1, line: frets.p.line + 1, prefix: '' },
  });

  await server.waitResponse('definition');

  server.send({
    command: 'definitionAndBoundSpan',
    arguments: { file: fileMain, offset: frets.p.character + 1, line: frets.p.line + 1, prefix: '' },
  });

  await server.waitResponse('definitionAndBoundSpan');

  await server.close();

  const definitionResponse = findResponse(server.responses, 'definition');
  assert(!!definitionResponse);
  assert(definitionResponse.body.length === 1);
  assert(definitionResponse.body[0].file === fileFragments);

  const definitionAndBoundSpanResponse = findResponse(server.responses, 'definitionAndBoundSpan');
  assert(!!definitionAndBoundSpanResponse);
  assert(definitionAndBoundSpanResponse.body.definitions.length === 1);
  assert(definitionAndBoundSpanResponse.body.definitions[0].file === fileFragments);
}

module.exports = run;
