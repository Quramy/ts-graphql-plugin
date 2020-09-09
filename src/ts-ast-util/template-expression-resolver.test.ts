import * as ts from 'typescript';
import { mark, Frets } from 'fretted-strings';

import { findAllNodes } from '.';
import { TemplateExpressionResolver } from '../ts-ast-util/template-expression-resolver';
import { createTestingLanguageService } from './testing/testing-language-service';

describe(TemplateExpressionResolver.prototype.resolve, () => {
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
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const actual = resolver.resolve('main.ts', node as ts.NoSubstitutionTemplateLiteral).resolvedInfo!;
    if (!actual) return fail();
    expect(actual.combinedText).toBe('');
    expect(() => actual.getInnerPosition(0)).toThrowError();
    expect(() => actual.getInnerPosition(14)).toThrowError();
    expect(actual.getInnerPosition(15)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: 15 });
  });

  it('should resolve for no closed NoSubstitutionTemplateLiteral node', () => {
    const frets = {} as Frets;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: mark(
            'const query = `query { }' + '\n' +
            '%%%           ^        ^   %%%' + '\n' +
            '%%%           a1       a2  %%%',
            frets,
          ),
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const actual = resolver.resolve('main.ts', node as ts.NoSubstitutionTemplateLiteral).resolvedInfo!;
    if (!actual) return fail();

    expect(actual.combinedText).toBe(
      // prettier-ignore
      mark(
        'query { }' + '\n' +
        '%%%     ^  %%%' + '\n' +
        '%%%     b2 %%%',
        frets,
      ),
    );

    expect(() => actual.getInnerPosition(frets.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: frets.a1.pos + 1 });

    expect(actual.getInnerPosition(frets.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b2.pos + 1 });
    expect(() => actual.getInnerPosition(frets.a2.pos + 2)).toThrowError();
    expect(actual.getSourcePosition(frets.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a2.pos + 1,
    });
    expect(() => actual.getSourcePosition(frets.b2.pos + 2)).toThrowError();
  });

  it('should resolve for closed NoSubstitutionTemplateLiteral node', () => {
    const frets = {} as Frets;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: mark(
            'const query = `query { }`' + '\n' +
            '%%%           ^        ^   %%%' + '\n' +
            '%%%           a1       a2  %%%',
            frets,
          ),
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const [node] = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const actual = resolver.resolve('main.ts', node as ts.NoSubstitutionTemplateLiteral).resolvedInfo!;
    if (!actual) return fail();

    expect(actual.combinedText).toBe(
      // prettier-ignore
      mark(
        'query { }' + '\n' +
        '%%%     ^  %%%' + '\n' +
        '%%%     b2 %%%',
        frets,
      ),
    );

    expect(() => actual.getInnerPosition(frets.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: frets.a1.pos + 1 });

    expect(actual.getInnerPosition(frets.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b2.pos + 1 });
    expect(() => actual.getInnerPosition(frets.a2.pos + 2)).toThrowError();
    expect(actual.getSourcePosition(frets.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a2.pos + 1,
    });
    expect(() => actual.getSourcePosition(frets.b2.pos + 2)).toThrowError();
  });

  it('should resolve templateExpression spans in no closed TemplateExpression node', () => {
    const frets = {} as Frets;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: mark('\n' +
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
            '    ', frets),
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const nodes = findAllNodes(source, node => ts.isTaggedTemplateExpression(node));
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const actual = resolver.resolve('main.ts', nodes[1] as ts.TemplateExpression).resolvedInfo!;
    if (!actual) return fail();

    // prettier-ignore
    const expectedCombinedText = mark('\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b1%%%' + '\n' +
      '      query MyQuery {'                   + '\n' +
      '        ...Hoge'                         + '\n' +
      '      }'                                 + '\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b2%%%' + '\n' +
      '    ', frets);

    expect(actual.combinedText).toBe(expectedCombinedText);

    expect(() => actual.getInnerPosition(frets.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: frets.a1.pos + 1 });

    expect(() => actual.getInnerPosition(frets.a2.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b1.pos + 1 });
    expect(actual.getSourcePosition(frets.b1.pos)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a3.pos,
      isInOtherExpression: true,
    });
    expect(actual.getSourcePosition(frets.b1.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a2.pos + 1,
    });

    expect(() => actual.getInnerPosition(frets.a4.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a4.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b2.pos + 1 });
    expect(actual.getSourcePosition(frets.b2.pos)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a5.pos,
      isInOtherExpression: true,
    });
    expect(actual.getSourcePosition(frets.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a4.pos + 1,
    });
  });

  it('should resolve templateExpression spans in closed TemplateExpression node', () => {
    const frets = {} as Frets;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: mark('\n' +
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
            '    `;', frets),
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const nodes = findAllNodes(source, node => ts.isTaggedTemplateExpression(node));
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const actual = resolver.resolve('main.ts', nodes[1] as ts.TemplateExpression).resolvedInfo!;
    if (!actual) return fail();

    // prettier-ignore
    const expectedCombinedText = mark('\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b1%%%' + '\n' +
      '      query MyQuery {'                   + '\n' +
      '        ...Hoge'                         + '\n' +
      '      }'                                 + '\n' +
      '      fragment Hoge on Foo { name }'     + '\n' +
      '%%%                               ^ %%%' + '\n' +
      '%%%                               b2%%%' + '\n' +
      '    ', frets);

    expect(actual.combinedText).toBe(expectedCombinedText);

    expect(() => actual.getInnerPosition(frets.a1.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a1.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: 0 });
    expect(actual.getSourcePosition(0)).toStrictEqual({ fileName: 'main.ts', pos: frets.a1.pos + 1 });

    expect(() => actual.getInnerPosition(frets.a2.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a2.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b1.pos + 1 });
    expect(actual.getSourcePosition(frets.b1.pos)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a3.pos,
      isInOtherExpression: true,
    });
    expect(actual.getSourcePosition(frets.b1.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a2.pos + 1,
    });

    expect(() => actual.getInnerPosition(frets.a4.pos)).toThrowError();
    expect(actual.getInnerPosition(frets.a4.pos + 1)).toStrictEqual({ fileName: 'main.ts', pos: frets.b2.pos + 1 });
    expect(actual.getSourcePosition(frets.b2.pos)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a5.pos,
      isInOtherExpression: true,
    });
    expect(actual.getSourcePosition(frets.b2.pos + 1)).toStrictEqual({
      fileName: 'main.ts',
      pos: frets.a4.pos + 1,
    });
  });

  describe('resolveErrors', () => {
    it('should return resolve errors when interpolation is too complex', () => {
      const frets = {} as Frets;
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            // prettier-ignore
            content: mark('\n' +
              '    const fragment = gql`fragment Hoge on Foo { name }`;'     + '\n' +
              '    const query = gql`'                                       + '\n' +
              '      ${fn(fragment)}'                                        + '\n' +
              '%%%     ^           ^                                    %%%' + '\n' +
              '%%%     a1          a2                                   %%%' + '\n' +
              '      query MyQuery {'                                        + '\n' +
              '        ...Hoge'                                              + '\n' +
              '      }'                                                      + '\n' +
              '    ', frets),
          },
        ],
      });
      const source = langService.getProgram()!.getSourceFile('main.ts');
      if (!source) return fail();
      const nodes = findAllNodes(source, node => ts.isTaggedTemplateExpression(node));
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', nodes[1] as ts.TemplateExpression);
      if (actual.resolvedInfo) return fail();
      expect(actual.resolveErrors).toStrictEqual([
        {
          fileName: 'main.ts',
          start: frets.a1.pos,
          end: frets.a2.pos,
        },
      ]);
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.NoSubstitutionTemplateLiteral).resolvedInfo!;
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });

    it('should return combined string with property access interpolation', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: `
              const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
              const obj = { fragment: fragment };
              const query = \`
                \${obj.fragment}
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });

    it('should return combined string with shorthand property access interpolation', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: `
              const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
              const obj = { fragment };
              const query = \`
                \${obj.fragment}
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });

    it('should return combined string with class static property interpolation', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'main.ts',
            content: `
              class MyClass {
                static fragment = \`
                  fragment Foo on Hoge {
                    name
                  }
                \`;
              }
              const query = \`
                \${MyClass.fragment}
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });

    it('should return combined string with hopping reference', () => {
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });

    it('should return combined string with reference between multiple files', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'fragment.ts',
            content: `
              export const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
            `,
          },
          {
            fileName: 'main.ts',
            content: `
              import { fragment } from './fragment';
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
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const actual = resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo!;
      expect(actual!.combinedText).toMatchSnapshot();
    });
  });

  describe('cache', () => {
    it('should store result to cache', () => {
      const langService = createTestingLanguageService({
        files: [
          {
            fileName: 'fragment.ts',
            content: `
              export const fragment = \`
                fragment Foo on Hoge {
                  name
                }\`;
            `,
          },
          {
            fileName: 'main.ts',
            content: `
              import { fragment } from './fragment';
              const query = \`
                \${fragment}
                query {
                  ...Foo
                }\`;
            `,
          },
        ],
      });
      const [node] = findAllNodes(langService.getProgram()!.getSourceFile('main.ts')!, node =>
        ts.isTemplateExpression(node),
      );
      const resolver = new TemplateExpressionResolver(langService, () => '');
      const firstResult = resolver.resolve('main.ts', node as ts.TemplateExpression);
      expect(resolver._resultCache.has(node)).toBeTruthy();
      expect(resolver.resolve('main.ts', node as ts.TemplateExpression).resolvedInfo).toBe(firstResult.resolvedInfo);
    });
  });
});

describe(TemplateExpressionResolver.prototype.update, () => {
  it('should return updated info arleady resolved with text replacement', () => {
    const frets = {} as Frets;
    const langService = createTestingLanguageService({
      files: [
        {
          fileName: 'main.ts',
          // prettier-ignore
          content: mark('\n' +
            '    const str = `'       + '\n' +
            '         aaaaaaa'        + '\n' +
            '         aaaaaaa'        + '\n' +
            '%%%      ^     ^    %%%' + '\n' +
            '%%%      a1    a2   %%%' + '\n' +
            '         bbbbbbb'        + '\n' +
            '    `;'                  + '\n' +
            '    ', frets),
        },
      ],
    });
    const source = langService.getProgram()!.getSourceFile('main.ts');
    if (!source) return fail();
    const nodes = findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node));
    const resolver = new TemplateExpressionResolver(langService, () => '');
    const originalInfo = resolver.resolve('main.ts', nodes[0] as ts.NoSubstitutionTemplateLiteral).resolvedInfo!;
    if (!originalInfo) return fail();
    const actual = resolver.update(
      originalInfo,
      {
        start: originalInfo.getInnerPosition(frets.a1.pos).pos,
        end: originalInfo.getInnerPosition(frets.a2.pos + 1).pos,
      },
      'xxxxx',
    );
    const expectedStr = mark(
      `
         aaaaaaa
         xxxxx
     %%% ^   ^    %%%
     %%% b1  b2   %%%
         bbbbbbb
    `,
      frets,
    );
    expect(actual.combinedText).toBe(expectedStr);
    expect(actual.getInnerPosition(frets.a1.pos - 1).pos).toBe(frets.b1.pos - 1);
    expect(actual.getInnerPosition(frets.a1.pos).pos).toBe(frets.b1.pos);
    expect(actual.getInnerPosition(frets.a1.pos + 1).pos).toBe(frets.b1.pos);
    expect(actual.getInnerPosition(frets.a2.pos).pos).toBe(frets.b1.pos);
    expect(actual.getInnerPosition(frets.a2.pos + 1).pos).toBe(frets.b2.pos + 1);
    expect(actual.getSourcePosition(frets.b1.pos - 1).pos).toBe(frets.a1.pos - 1);
    expect(actual.getSourcePosition(frets.b1.pos).pos).toBe(frets.a1.pos);
    expect(actual.getSourcePosition(frets.b1.pos + 1).pos).toBe(frets.a1.pos);
    expect(actual.getSourcePosition(frets.b2.pos).pos).toBe(frets.a1.pos);
    expect(actual.getSourcePosition(frets.b2.pos + 1).pos).toBe(frets.a2.pos + 1);
  });
});
