import ts from 'typescript';
import { DocumentNode, parse, visit } from 'graphql';

import { getTransformer } from './transformer';

function transformAndPrint({
  tag,
  target,
  docContent,
  tsContent,
  removeFragmentDefinitions = true,
  documentTransformers = [],
  enabled = true,
}: {
  tag?: string;
  target: 'text' | 'object';
  docContent: string;
  tsContent: string;
  removeFragmentDefinitions?: boolean;
  documentTransformers?: ((doc: DocumentNode) => DocumentNode)[];
  enabled?: boolean;
}) {
  const getDocumentNode = () => parse(docContent);
  const source = ts.createSourceFile('main.ts', tsContent, ts.ScriptTarget.Latest, true);
  const transformer = getTransformer({
    tag,
    target,
    getDocumentNode,
    removeFragmentDefinitions,
    documentTransformers,
    getEnabled: () => enabled,
  });
  const { transformed } = ts.transform(source, [transformer]);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed[0]);
}

describe('transformer', () => {
  describe('GraphQL document transformation', () => {
    it('should transform TaggedTemplateExpression', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = hoge\`abc\`;
        `,
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should transform NoSubstitutionTemplateLiteral', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = \`abc\`;
        `,
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should transform TemplateExpression', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = \`abc\${def}\`;
        `,
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should ignore TaggedTemplateExpression when the node does not match tag name', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = hoge\`abc\`;
        `,
          tag: 'foo',
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should transform TaggedTemplateExpression when the node matches tag name', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = hoge\`abc\`;
        `,
          tag: 'hoge',
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should ignore NoSubstitutionTemplateLiteral when tag is set', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = \`abc\`;
        `,
          tag: 'foo',
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should ignore TemplateExpression when tag is set', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = \`abc\${def}\`;
        `,
          tag: 'foo',
          docContent: `
          query {
            hello
          }
        `,
          target: 'object',
        }),
      ).toMatchSnapshot();
    });

    it('should transform to 0 literal when removeFragmentDefinitions: true and document has only fragments', () => {
      expect(
        transformAndPrint({
          tsContent: `
            const fragment = hoge\`abc\`;
          `,
          docContent: `
            fragment X on Query {
              helo
            }
          `,
          target: 'object',
          removeFragmentDefinitions: true,
        }),
      ).toMatchSnapshot();
    });

    it('should transform to string literal when target is text', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = hoge\`abc\`;
        `,
          docContent: `
          query MyQuery {
            hello
          }
        `,
          target: 'text',
        }),
      ).toMatchSnapshot();
    });

    it('should transform to empty string when removeFragmentDefinitions: true and document has only fragments, text target', () => {
      expect(
        transformAndPrint({
          tsContent: `
            const fragment = hoge\`abc\`;
          `,
          docContent: `
            fragment X on Query {
              helo
            }
          `,
          target: 'text',
          removeFragmentDefinitions: true,
        }),
      ).toMatchSnapshot();
    });

    it('should transform inner document with documentTransformers', () => {
      expect(
        transformAndPrint({
          tsContent: `
          const query = hoge\`abc\`;
        `,
          docContent: `
          query MyQuery {
            hello
          }
          mutation MyMutation {
            bye
          }
        `,
          target: 'object',
          documentTransformers: [
            doc =>
              visit(doc, {
                OperationDefinition: node => (node.operation === 'query' ? node : null),
              }),
          ],
        }),
      ).toMatchSnapshot();
    });
  });

  describe('import declaration transformation', () => {
    describe('default import', () => {
      it('should remove tag import when tag is matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import hoge from "hoge";',
            tag: 'hoge',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should remove only matched identifier', () => {
        expect(
          transformAndPrint({
            tsContent: 'import hoge, { foo } from "hoge";',
            tag: 'hoge',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should ignore tag import when tag is not matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import hoge from "hoge";',
            tag: 'foo',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should ignore tag import without tag', () => {
        expect(
          transformAndPrint({
            tsContent: 'import hoge from "hoge";',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });
    });

    describe('named import', () => {
      it('should remove tag import when tag is matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import { hoge } from "hoge";',
            tag: 'hoge',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should remove alias tag import when tag is matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import { foo as hoge } from "hoge";',
            tag: 'hoge',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should remove only matched identifier', () => {
        expect(
          transformAndPrint({
            tsContent: 'import foo, { hoge, bar } from "hoge";',
            tag: 'hoge',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should ignore tag import when tag is not matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import { hoge } from "hoge";',
            tag: 'foo',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should ignore tag import without tag', () => {
        expect(
          transformAndPrint({
            tsContent: 'import { hoge } from "hoge";',
            docContent: '',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should remove * as import tag when tag is matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import * as hoge from "hoge";',
            docContent: '',
            tag: 'hoge',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });

      it('should ignore * as import when tag is not matched', () => {
        expect(
          transformAndPrint({
            tsContent: 'import * as hoge from "hoge";',
            docContent: '',
            tag: 'foo',
            target: 'object',
          }),
        ).toMatchSnapshot();
      });
    });
  });

  describe('misc options', () => {
    it('should nothing when getEnabled option returns false', () => {
      expect(
        transformAndPrint({
          tsContent: `const query = \`abc\`;`,
          docContent: ``,
          target: 'object',
          enabled: false,
        }),
      ).toMatchSnapshot();
    });
  });
});
