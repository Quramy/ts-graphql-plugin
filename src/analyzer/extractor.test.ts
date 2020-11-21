import { print } from 'graphql';
import { Extractor, ExtractSucceededResult } from './extractor';
import { createTesintExtractor } from './testing/testing-extractor';

describe(Extractor, () => {
  it('should extract GraphQL documents', () => {
    const extractor = createTesintExtractor([
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
    const extractor = createTesintExtractor(
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
    const extractor = createTesintExtractor(
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

  it('should store template resolve errors with too complex interpolation', () => {
    const extractor = createTesintExtractor([
      {
        fileName: 'main.ts',
        content: `
          import gql from 'graphql-tag';
          const fragment = gql\`
            fragment MyFragment on Query {
              hello
            }
          \`;
          const query = gql\`
            \${fn(fragment)}
            query MyQuery {
              ...MyFragment
            }
          \`;
        `,
      },
    ]);
    const result = extractor.extract(['main.ts'], 'gql');
    expect(result[0].resolevedTemplateInfo).toBeTruthy();
    expect(result[1].resolevedTemplateInfo).toBeFalsy();
    expect(result[1].resolveTemplateError).toMatchSnapshot();
  });

  it('should store GraphQL syntax errors with invalid document', () => {
    const extractor = createTesintExtractor([
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
    const extractor = createTesintExtractor([
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

  describe('getDominantDefinition', () => {
    it('should detect query type when document has only query', () => {
      const extractor = createTesintExtractor([
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
      const { type, operationName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('query');
      expect(operationName).toBe('MyQuery');
    });

    it('should detect mutation type when document has only mutation', () => {
      const extractor = createTesintExtractor([
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
      const { type, operationName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('mutation');
      expect(operationName).toBe('MyMutation');
    });

    it('should detect subscription type when document has only subscription', () => {
      const extractor = createTesintExtractor([
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
      const { type, operationName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('subscription');
      expect(operationName).toBe('MySubscription');
    });

    it('should return complex type with complex operations', () => {
      const extractor = createTesintExtractor([
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
      const { type, operationName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('complex');
      expect(operationName).toBe('MULTIPLE_OPERATIONS');
    });

    it('should detect fragment type when document has fragment and does not have any operations', () => {
      const extractor = createTesintExtractor([
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
      const { type, fragmentName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment');
    });

    it('should detect fragment name to be exported', () => {
      const extractor = createTesintExtractor([
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
      const { type, fragmentName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment');
    });

    it('should return the last fragments which are not referenced from others', () => {
      const extractor = createTesintExtractor([
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
      const { type, fragmentName } = extractor.getDominantDefinition(result[0]);
      expect(type).toBe('fragment');
      expect(fragmentName).toBe('MyFragment2');
    });
  });
});
