import { TypedQueryDocumentAddonFactory } from './typed-query-document';
import { createAddonTester } from './testing/addon-tester';

describe(TypedQueryDocumentAddonFactory, () => {
  const addonTester = createAddonTester(TypedQueryDocumentAddonFactory);

  const sdl = `
    type Query {
      hello: String!
    }
  `;

  it('should add export statement using TypedQueryDocumentNode', () => {
    const { outputSourceFiles } = addonTester.generateTypes({
      files: [{ fileName: 'main.ts', content: 'const query = `query MyQuery { hello }`' }],
      schemaSDL: sdl,
    });
    expect(outputSourceFiles.map(f => f.content)).toMatchSnapshot();
  });
});
