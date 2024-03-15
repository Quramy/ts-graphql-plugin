import { MarkdownReporter } from './markdown-reporter';
import { createTesintExtractor } from './testing/testing-extractor';
import { parseTagConfig } from '../ts-ast-util';

describe(MarkdownReporter, () => {
  it('should convert from manifest to markdown content', () => {
    const extractor = createTesintExtractor([
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
    const manifest = extractor.toManifest(
      extractor.extract(['/prj-root/src/main.ts'], parseTagConfig('gql')),
      parseTagConfig('gql'),
    );
    const content = new MarkdownReporter().toMarkdownConntent(manifest, {
      baseDir: '/prj-root',
      outputDir: '/prj-root/dist',
    });
    expect(content).toMatchSnapshot();
  });

  it('should convert from manifest to markdown content with ignoreFragments: false', () => {
    const extractor = createTesintExtractor([
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
    const manifest = extractor.toManifest(
      extractor.extract(['/prj-root/src/main.ts'], parseTagConfig('gql')),
      parseTagConfig('gql'),
    );
    const content = new MarkdownReporter().toMarkdownConntent(manifest, {
      ignoreFragments: false,
      baseDir: '/prj-root',
      outputDir: '/prj-root/dist',
    });
    expect(content).toMatchSnapshot();
  });
});
