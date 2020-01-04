import { print } from 'graphql';
import { Extractor } from './extractor';
import { createTestingLanguageServiceAndHost } from '../ts-ast-util/testing/lang-service-fixture';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';

function createExtractor(files: { fileName: string; content: string }[]) {
  const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({ files });
  const extractor = new Extractor({
    scriptSourceHelper: createScriptSourceHelper({ languageService, languageServiceHost }),
  });
  return extractor;
}

describe(Extractor, () => {
  it('should extract GraphQL documents', () => {
    const extractor = createExtractor([
      {
        fileName: 'main.ts',
        content: `
        import gql from 'graphql-tag';
        const query = gql\`
          query MyQuery {
            hello
          }
        \`;
        const mutation = gql\`
          mutation Greeting {
            greeting {
              reply
            }
          }
        \`;
      `,
      },
    ]);
    const result = extractor.extract(['main.ts'], 'gql');
    expect(result.map(r => print(r.documentNode!))).toMatchSnapshot();
  });

  it('should store GraphQL syntax errors with invalid document', () => {
    const extractor = createExtractor([
      {
        fileName: 'main.ts',
        content: `
        import gql from 'graphql-tag';
        const query = gql\`
          query MyQuery {
          }
        \`;
      `,
      },
    ]);
    const result = extractor.extract(['main.ts'], 'gql');
    expect(result[0].graphqlError).toBeTruthy();
  });

  it('should convert results to manifest JSON', () => {
    const extractor = createExtractor([
      {
        fileName: 'main.ts',
        content: `
        import gql from 'graphql-tag';
        const query = gql\`
          query MyQuery {
            hello
          }
        \`;
        const mutation = gql\`
          mutation Greeting {
            greeting {
              reply
            }
          }
        \`;
      `,
      },
    ]);
    const result = extractor.extract(['main.ts'], 'gql');
    expect(extractor.toManifest(result)).toMatchSnapshot();
  });
});
