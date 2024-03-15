import ts from 'typescript';
import { findAllNodes } from './utilily-functions';
import type { TagConfig, StrictTagCondition } from './types';
import { parseTagConfig, getTemplateNodeUnder, getTagName } from './tag-utils';

describe(parseTagConfig, () => {
  test.each([
    {
      config: undefined,
      expected: {
        names: [],
        allowNotTaggedTemplate: true,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: '',
      expected: {
        names: [],
        allowNotTaggedTemplate: true,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: 'gql',
      expected: {
        names: ['gql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: ['gql', 'graphql'],
      expected: {
        names: ['gql', 'graphql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: {},
      expected: {
        names: [],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: {
        name: 'gql',
      } satisfies TagConfig,
      expected: {
        names: ['gql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: {
        name: ['gql', 'graphql'],
      } satisfies TagConfig,
      expected: {
        names: ['gql', 'graphql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: {
        name: ['graphql'],
        ignoreFunctionCallExpression: true,
      } satisfies TagConfig,
      expected: {
        names: ['graphql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: false,
      } as StrictTagCondition,
    },
    {
      config: {
        name: ['graphql'],
        ignoreFunctionCallExpression: false,
      } satisfies TagConfig,
      expected: {
        names: ['graphql'],
        allowNotTaggedTemplate: false,
        allowTaggedTemplateExpression: true,
        allowFunctionCallExpression: true,
      } as StrictTagCondition,
    },
  ])('input: $config', ({ config, expected }) => {
    expect(parseTagConfig(config)).toEqual(expected);
  });
});

describe(getTemplateNodeUnder, () => {
  const createFixture = (sourceText: string, tagConfig: TagConfig) => {
    const source = ts.createSourceFile('input.ts', sourceText, ts.ScriptTarget.Latest, false);
    return {
      exec: () => findAllNodes(source, node => getTemplateNodeUnder(node, parseTagConfig(tagConfig))),
    };
  };

  it.each([
    { source: '`query { }`', config: undefined },
    { source: 'gql`query { }`', config: 'gql' },
    { source: 'gql`query { }`', config: ['gql', 'graphql'] },
    {
      source: 'graphql(`query { }`)',
      config: { name: 'graphql', ignoreFunctionCallExpression: false } satisfies TagConfig,
    },
  ])('should return TemplateLiteralNode from $source with tagCongig: $config', ({ source, config }) => {
    const [found] = createFixture(source, config).exec();
    expect(found).toBeTruthy();
  });

  test.each([
    { source: '`query { }`', config: 'gql' },
    { source: 'graphql`query { }`', config: 'gql' },
    {
      source: 'fn(`query { }`)',
      config: { name: 'graphql', ignoreFunctionCallExpression: false } satisfies TagConfig,
    },
    {
      source: 'graphql(`query { }`)',
      config: { name: 'graphql', ignoreFunctionCallExpression: true } satisfies TagConfig,
    },
  ])('should not return undefind from $source with tagCongig: $config', ({ source, config }) => {
    const actual = createFixture(source, config).exec();
    expect(actual).toEqual([]);
  });
});

describe(getTagName, () => {
  const createFixture = (sourceText: string, tagConfig: TagConfig) => {
    const source = ts.createSourceFile('input.ts', sourceText, ts.ScriptTarget.Latest, true);
    return {
      exec: () =>
        findAllNodes(source, node => getTemplateNodeUnder(node, parseTagConfig(tagConfig))).map(n =>
          getTagName(n, parseTagConfig(tagConfig)),
        ),
    };
  };

  it.each([
    { source: '`query { }`', expected: '', config: undefined },
    { source: 'gql`query { }`', expected: 'gql', config: 'gql' },
    { source: 'gql`query { }`', expected: 'gql', config: ['gql', 'graphql'] },
    {
      source: 'graphql(`query { }`)',
      expected: 'graphql',
      config: { name: 'graphql', ignoreFunctionCallExpression: false } satisfies TagConfig,
    },
  ])('should return TemplateLiteralNode from $source with tagCongig: $config', ({ source, expected, config }) => {
    const actual = createFixture(source, config).exec();
    expect(actual).toEqual([expected]);
  });

  it('return empty string when node is parsed without parent', () => {
    const sourceText = 'gql`query { }`';
    const source = ts.createSourceFile('input.ts', sourceText, ts.ScriptTarget.Latest, false);
    const actual = findAllNodes(source, node => getTemplateNodeUnder(node, parseTagConfig('gql'))).map(n =>
      getTagName(n, parseTagConfig('gql')),
    );
    expect(actual).toEqual([undefined]);
  });

  it('return empty string when node does not match condition', () => {
    const sourceText = '`hoge`';
    const source = ts.createSourceFile('input.ts', sourceText, ts.ScriptTarget.Latest, true);
    const actual = getTagName(source.statements[0] as unknown as ts.TemplateLiteral, parseTagConfig('gql'));
    expect(actual).toBe(undefined);
  });

  it('return empty string when node parent is not TaggedTemplateExpression nor CallExpression', () => {
    const sourceText = 'const obj = { x: `hoge` }';
    const source = ts.createSourceFile('input.ts', sourceText, ts.ScriptTarget.Latest, true);
    const actual = getTagName(
      findAllNodes(source, node => ts.isNoSubstitutionTemplateLiteral(node) && node)[0],
      parseTagConfig('gql'),
    );
    expect(actual).toBe(undefined);
  });
});
