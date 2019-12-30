import * as ts from 'typescript';

import { findAllNodes } from './index';
import { resolveTemplateExpression } from './resolve-template-expression';
import { createTestingLanguageService } from '../testing/lang-service-fixture';
import { contentMark, Markers } from '../testing/content-mark';

describe(resolveTemplateExpression, () => {
  it('should resolve for empty NoSubstitutionTemplateLiteral node', () => {
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          content: 'const query = ``',
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const actual = resolveTemplateExpression({
      node: node as ts.NoSubstitutionTemplateLiteral,
      fileName: 'main.ts',
      languageService: langService,
    });
    if (!actual) return fail();
    expect(actual.combinedText).toBe('');
    expect(() => actual.getInnerPosition(0)).toThrowError();
    expect(() => actual.getInnerPosition(14)).toThrowError();
    expect(actual.getInnerPosition(15)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: 15 });
  });

  it('should resolve for no closed NoSubstitutionTemplateLiteral node', () => {
    const markers = {} as Markers;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: contentMark(
            'const query = `query { }' + '\n' +
            '%%%           ^        ^   %%%' + '\n' +
            '%%%           a1       a2  %%%',
            markers,
          )
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const actual = resolveTemplateExpression({
      node: node as ts.NoSubstitutionTemplateLiteral,
      fileName: 'main.ts',
      languageService: langService,
    });
    if (!actual) return fail();

    expect(actual.combinedText).toBe(
      // prettier-ignore
      contentMark(
        'query { }' + '\n' +
        '%%%     ^  %%%' + '\n' +
        '%%%     b2 %%%',
        markers,
      ),
    );

    expect(() => actual.getInnerPosition(markers.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: markers.a1.pos + 1 });

    expect(actual.getInnerPosition(markers.a2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.b2.pos });
    expect(() => actual.getInnerPosition(markers.a2.pos + 1)).toThrowError();
    expect(actual.getSourcePosition(markers.b2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a2.pos });
    expect(() => actual.getSourcePosition(markers.b2.pos + 1)).toThrowError();
  });

  it('should resolve for closed NoSubstitutionTemplateLiteral node', () => {
    const markers = {} as Markers;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: contentMark(
            'const query = `query { }`' + '\n' +
            '%%%           ^        ^   %%%' + '\n' +
            '%%%           a1       a2  %%%',
            markers,
          )
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const actual = resolveTemplateExpression({
      node: node as ts.NoSubstitutionTemplateLiteral,
      fileName: 'main.ts',
      languageService: langService,
    });
    if (!actual) return fail();

    expect(actual.combinedText).toBe(
      // prettier-ignore
      contentMark(
        'query { }' + '\n' +
        '%%%     ^  %%%' + '\n' +
        '%%%     b2 %%%',
        markers,
      ),
    );

    expect(() => actual.getInnerPosition(markers.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: markers.a1.pos + 1 });

    expect(actual.getInnerPosition(markers.a2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.b2.pos });
    expect(() => actual.getInnerPosition(markers.a2.pos + 1)).toThrowError();
    expect(actual.getSourcePosition(markers.b2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a2.pos });
    expect(() => actual.getSourcePosition(markers.b2.pos + 1)).toThrowError();
  });

  it('should resolve templateExpression spans in no closed TemplateExpression node', () => {
    const markers = {} as Markers;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: contentMark('\n' +
            '    const fragment = gql`fragment Hoge on Foo { name }`;'     + '\n' +
            '    const query = gql`'                                       + '\n' +
            '%%%                  ^                                   %%%' + '\n' +
            '%%%                  a1                                  %%%' + '\n' +
            '      ${fragment}'                                            + '\n' +
            '%%%     ^       ^                                        %%%' + '\n' +
            '%%%     a3      a2                                       %%%' + '\n' +
            '      query MyQuery {'                                        + '\n' +
            '        ...Hoge'                                              + '\n' +
            '      }'                                                      + '\n' +
            '      ${fragment}'                                            + '\n' +
            '%%%     ^       ^                                        %%%' + '\n' +
            '%%%     a5      a4                                       %%%' + '\n' +
            '    ', markers)
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [_, node] = findAllNodes(source, node => ts.isTaggedTemplateExpression(node));
    const actual = resolveTemplateExpression({
      node: node as ts.TaggedTemplateExpression,
      fileName: 'main.ts',
      languageService: langService,
    });
    if (!actual) return fail();

    // prettier-ignore
    const expectedCombinedText = contentMark('\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b1%%%' + '\n' +
      '      query MyQuery {'                   + '\n' +
      '        ...Hoge'                         + '\n' +
      '      }'                                 + '\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b2%%%' + '\n' +
      '    ', markers);

    expect(actual.combinedText).toBe(expectedCombinedText);

    expect(() => actual.getInnerPosition(markers.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: markers.a1.pos + 1 });

    expect(() => actual.getInnerPosition(markers.a2.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: markers.b1.pos + 1 });
    expect(actual.getSourcePosition(markers.b1.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a3.pos });
    expect(actual.getSourcePosition(markers.b1.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: markers.a2.pos + 1,
    });

    expect(() => actual.getInnerPosition(markers.a4.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a4.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: markers.b2.pos + 1 });
    expect(actual.getSourcePosition(markers.b2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a5.pos });
    expect(actual.getSourcePosition(markers.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: markers.a4.pos + 1,
    });
  });

  it('should resolve templateExpression spans in closed TemplateExpression node', () => {
    const markers = {} as Markers;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: contentMark('\n' +
            '    const fragment = gql`fragment Hoge on Foo { name }`;'     + '\n' +
            '    const query = gql`'                                       + '\n' +
            '%%%                  ^                                   %%%' + '\n' +
            '%%%                  a1                                  %%%' + '\n' +
            '      ${fragment}'                                            + '\n' +
            '%%%     ^       ^                                        %%%' + '\n' +
            '%%%     a3      a2                                       %%%' + '\n' +
            '      query MyQuery {'                                        + '\n' +
            '        ...Hoge'                                              + '\n' +
            '      }'                                                      + '\n' +
            '      ${fragment}'                                            + '\n' +
            '%%%     ^       ^                                        %%%' + '\n' +
            '%%%     a5      a4                                       %%%' + '\n' +
            '    `;', markers)
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [_, node] = findAllNodes(source, node => ts.isTaggedTemplateExpression(node));
    const actual = resolveTemplateExpression({
      node: node as ts.TaggedTemplateExpression,
      fileName: 'main.ts',
      languageService: langService,
    });
    if (!actual) return fail();

    // prettier-ignore
    const expectedCombinedText = contentMark('\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b1%%%' + '\n' +
      '      query MyQuery {'                   + '\n' +
      '        ...Hoge'                         + '\n' +
      '      }'                                 + '\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b2%%%' + '\n' +
      '    ', markers);

    expect(actual.combinedText).toBe(expectedCombinedText);

    expect(() => actual.getInnerPosition(markers.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: markers.a1.pos + 1 });

    expect(() => actual.getInnerPosition(markers.a2.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: markers.b1.pos + 1 });
    expect(actual.getSourcePosition(markers.b1.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a3.pos });
    expect(actual.getSourcePosition(markers.b1.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: markers.a2.pos + 1,
    });

    expect(() => actual.getInnerPosition(markers.a4.pos)).toThrowError();
    expect(actual.getInnerPosition(markers.a4.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: markers.b2.pos + 1 });
    expect(actual.getSourcePosition(markers.b2.pos)).toStrictEqual({ fileName: 'main.ts', pos: markers.a5.pos });
    expect(actual.getSourcePosition(markers.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: markers.a4.pos + 1,
    });
  });

  describe('string combinination pattern', () => {
    it('should return combined string in NoSubstitutionTemplateLiteral', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: 'const query = `query { }`',
          },
        ],
      });
      const source = langService.getProgram()!.getSourceFile('main.ts');
      if (!source) return fail();
      const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
      const actual = resolveTemplateExpression({
        node: node as ts.NoSubstitutionTemplateLiteral,
        fileName: 'main.ts',
        languageService: langService,
      });
      expect(actual!.combinedText).toBe('query { }');
    });

    it('should return combined string in TemplateExpression with StringLiteral', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: "const query = `query { ${'foo'} }`",
          },
        ],
      });
      const source = langService.getProgram()!.getSourceFile('main.ts');
      if (!source) return fail();
      const [node] = findAllNodes(source, node => ts.isTemplateExpression(node));
      const actual = resolveTemplateExpression({
        node: node as ts.NoSubstitutionTemplateLiteral,
        fileName: 'main.ts',
        languageService: langService,
      });
      expect(actual!.combinedText).toBe('query { foo }');
    });

    it('should return combined string with reference to other literal', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: `
              const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
              const query = \`
                \${fragment}
                query {
                  ...Foo
                }\`;
            `,
          },
        ],
      });
      const source = langService.getProgram()!.getSourceFile('main.ts');
      if (!source) return fail();
      const [node] = findAllNodes(source, node => ts.isTemplateExpression(node));
      const actual = resolveTemplateExpression({
        node: node as ts.NoSubstitutionTemplateLiteral,
        fileName: 'main.ts',
        languageService: langService,
      });
      const expectedText = `
                
                fragment Foo on Hoge {
                  name
                }
                query {
                  ...Foo
                }`;
      expect(actual!.combinedText).toBe(expectedText);
    });

    fit('should return combined string with hopping reference', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: `
              const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
              const f2 = fragment;
              const query = \`
                \${f2}
                query {
                  ...Foo
                }\`;
            `,
          },
        ],
      });
      const source = langService.getProgram()!.getSourceFile('main.ts');
      if (!source) return fail();
      const [node] = findAllNodes(source, node => ts.isTemplateExpression(node));
      const actual = resolveTemplateExpression({
        node: node as ts.NoSubstitutionTemplateLiteral,
        fileName: 'main.ts',
        languageService: langService,
      });
      const expectedText = `
                
                fragment Foo on Hoge {
                  name
                }
                query {
                  ...Foo
                }`;
      expect(actual!.combinedText).toBe(expectedText);
    });
  });
});
