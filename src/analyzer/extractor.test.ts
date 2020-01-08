import { print } from 'graphql';
import { Extractor, ExtractSucceededResult } from './extractor';
import { createTestingLanguageServiceAndHost } from '../ts-ast-util/testing/testing-language-service';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';

function createExtractor(files: { fileName: string; content: string }[], removeDuplicatedFragments = false) {
  const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({ files });
  const extractor = new Extractor({
    removeDuplicatedFragments,
    scriptSourceHelper: createScriptSourceHelper({ languageService, languageServiceHost }),
    debug: () => {},
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

  it('should extract GraphQL documents and shrink duplicated fragments when removeDuplicatedFragments: true', () => {
    const extractor = createExtractor(
      [
        {
          fileName: 'main.ts',
          content: `
        import gql from 'graphql-tag';
        const query = gql\`
          fragment A on Query {
            hello
          }
          fragment A on Query {
            hello
          }
          query MyQuery {
            ...A
          }
        \`;
      `,
        },
      ],
      true,
    );
    const result = extractor.extract(['main.ts'], 'gql');
    expect(result.map(r => print(r.documentNode!))).toMatchSnapshot();
  });

  it('should extract GraphQL documents and shrink duplicated fragments when removeDuplicatedFragments: false', () => {
    const extractor = createExtractor(
      [
        {
          fileName: 'main.ts',
          content: `
        import gql from 'graphql-tag';
        const query = gql\`
          fragment A on Query {
            hello
          }
          fragment A on Query {
            hello
          }
          query MyQuery {
            ...A
          }
        \`;
      `,
        },
      ],
      false,
    );
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

  describe('getDominantDefiniton', () => {
    it('should detect query type when document has only query', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              fragment X on Query {
                hello
              }
              query MyQuery {
                ...X
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, operationName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('query');
      expect(operationName).toBe('MyQuery');
    });

    it('should detect mutation type when document has only mutation', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              mutation MyMutation {
                greeting {
                  reply
                }
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, operationName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('mutation');
      expect(operationName).toBe('MyMutation');
    });

    it('should detect subscription type when document has only subscription', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              subscription MySubscription {
                greeting {
                  reply
                }
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, operationName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('subscription');
      expect(operationName).toBe('MySubscription');
    });

    it('should return complex type with complex operations', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              subscription MySubscription {
                greeting {
                  reply
                }
              }
              mutation MyMutation {
                greeting {
                  reply
                }
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, operationName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('complex');
      expect(operationName).toBe('MULTIPLE_OPERATIONS');
    });

    it('should detect fragment type when document has fragment and does not have any operations', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              fragment MyFragment on Query {
                hello
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, fragmentName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment');
    });

    it('should detect fragment name to be exported', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              fragment MyFragment on Query {
                ...X
                hello
              }
              fragment X on Query {
                hello
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, fragmentName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment');
    });

    it('should return the last fragments which are not referenced from others', () => {
      const extractor = createExtractor([
        {
          fileName: 'main.ts',
          content: `
            import gql from 'graphql-tag';
            const query = gql\`
              fragment MyFragment1 on Query {
                ...X
                hello
              }
              fragment MyFragment2 on Query {
                ...X
                hello
              }
              fragment X on Query {
                hello
              }
            \`;
          `,
        },
      ]);
      const result = extractor.extract(['main.ts'], 'gql') as ExtractSucceededResult[];
      const { type, fragmentName } = extractor.getDominantDefiniton(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment2');
    });
  });
});
