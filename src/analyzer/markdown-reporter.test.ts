import { Extractor } from './extractor';
import { MarkdownReporter } from './markdown-reporter';
import { createTestingLanguageServiceAndHost } from '../ts-ast-util/testing/testing-language-service';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';

function createExtractor(files: { fileName: string; content: string }[]) {
  const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({ files });
  const extractor = new Extractor({
    removeDuplicatedFragments: true,
    scriptSourceHelper: createScriptSourceHelper({ languageService, languageServiceHost }),
    debug: () => {},
  });
  return extractor;
}

describe(MarkdownReporter, () => {
  it('should convert from manifest to markdown content', () => {
    const extractor = createExtractor([
      {
        fileName: '/prj-root/src/main.ts',
        content: `
        import gql from 'graphql-tag';
        const fragment = gql\`
          fragment MyFragment on Query {
            hello
          }
        \`;
        const query = gql\`
          \${fragment}
          query MyQuery {
            ...MyFragment
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
    const manifest = extractor.toManifest(extractor.extract(['/prj-root/src/main.ts'], 'gql'));
    const content = new MarkdownReporter().toMarkdownConntent(manifest, {
      baseDir: '/prj-root',
      outputDir: '/prj-root/dist',
    });
    expect(content).toMatchSnapshot();
  });

  it('should convert from manifest to markdown content with ignoreFragments: false', () => {
    const extractor = createExtractor([
      {
        fileName: '/prj-root/src/main.ts',
        content: `
        import gql from 'graphql-tag';
        const fragment = gql\`
          fragment MyFragment on Query {
            hello
          }
        \`;
        const query = gql\`
          \${fragment}
          query MyQuery {
            ...MyFragment
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
    const manifest = extractor.toManifest(extractor.extract(['/prj-root/src/main.ts'], 'gql'));
    const content = new MarkdownReporter().toMarkdownConntent(manifest, {
      ignoreFragments: false,
      baseDir: '/prj-root',
      outputDir: '/prj-root/dist',
    });
    expect(content).toMatchSnapshot();
  });
});
