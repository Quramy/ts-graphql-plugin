import ts from 'typescript';
import { DocumentNode, parse, visit } from 'graphql';

import { getTransformer } from './transformer';

function transformAndPrint({
  tag,
  target,
  docContent,
  tsContent,
  documentTransformers = [],
}: {
  tag?: string;
  target: 'text' | 'object';
  docContent: string;
  tsContent: string;
  documentTransformers?: ((doc: DocumentNode) => DocumentNode)[];
}) {
  const getDocumentNode = () => parse(docContent);
  const source = ts.createSourceFile('main.ts', tsContent, ts.ScriptTarget.Latest, true);
  const transformer = getTransformer({
    tag,
    target,
    getDocumentNode,
    documentTransformers,
  });
  const { transformed } = ts.transform(source, [transformer]);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed[0]);
}

describe('transformer', () => {
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

  it('should transform innder document with documentTransformers', () => {
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
