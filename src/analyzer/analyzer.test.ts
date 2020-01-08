import ts from 'typescript';
import { TsGraphQLPluginConfigOptions } from '../types';
import { Analyzer } from './analyzer';
import { createTestingLanguageServiceAndHost } from '../ts-ast-util/testing/testing-language-service';
import { createTestingSchemaManagerHost } from '../schema-manager/testing/testing-schema-manager-host';
import { SchemaManagerFactory } from '../schema-manager/schema-manager-factory';

type CreateTestingAnalyzerOptions = {
  files: { fileName: string; content: string }[];
  sdl: string;
};
function createTestingAnalyzer({ files: sourceFiles, sdl }: CreateTestingAnalyzerOptions) {
  const files = [{ fileName: '/schema.graphql', content: sdl }, ...sourceFiles];
  const { languageServiceHost } = createTestingLanguageServiceAndHost({ files: sourceFiles });
  const pluginConfig: TsGraphQLPluginConfigOptions = {
    name: 'ts-graphql-plugin',
    schema: '/schema.graphql',
    localSchemaExtensions: [],
    removeDuplicatedFragments: true,
    tag: 'gql',
  };
  const schemaManagerHost = createTestingSchemaManagerHost({
    ...pluginConfig,
    prjRootPath: '',
    files,
  });
  return new Analyzer(
    pluginConfig,
    '',
    languageServiceHost,
    new SchemaManagerFactory(schemaManagerHost).create(),
    () => {},
  );
}

const simpleSources = {
  sdl: `
  type Query {
    hello: String!
  }
  `,
  files: [
    {
      fileName: 'main.ts',
      content: 'const query = gql`query MyQuery { hello }`;',
    },
  ],
};

const semanticErrorPrj = {
  sdl: `
  type Query {
    hello: String!
  }
  `,
  files: [
    {
      fileName: 'main.ts',
      content: 'const query = gql`query MyQuery { helloo }`;',
    },
  ],
};

describe(Analyzer, () => {
  describe(Analyzer.prototype.extract, () => {
    it('should extract manifest', () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      expect(analyzer.extract()).toMatchSnapshot();
    });
  });

  describe(Analyzer.prototype.validate, () => {
    it('should validate project with normal project', async () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const { errors, schema } = await analyzer.validate();
      expect(errors.length).toBe(0);
      expect(schema).toBeTruthy();
    });

    it('should validate project with semantic error project', async () => {
      const analyzer = createTestingAnalyzer(semanticErrorPrj);
      const { errors, schema } = await analyzer.validate();
      expect(errors.length).toBe(1);
      expect(schema).toBeTruthy();
    });
  });

  describe(Analyzer.prototype.report, () => {
    it('should create markdown report', () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const [errors, output] = analyzer.report('out.md');
      expect(errors.length).toBe(0);
      expect(output).toMatchSnapshot();
    });
  });

  describe(Analyzer.prototype.typegen, () => {
    it('should create type files', async () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const { outputSourceFiles } = await analyzer.typegen();
      if (!outputSourceFiles) return fail();
      expect(outputSourceFiles.length).toBe(1);
      expect(outputSourceFiles[0].fileName.endsWith('__generated__/my-query.ts')).toBeTruthy();
      const printer = ts.createPrinter();
      expect(printer.printFile(outputSourceFiles[0])).toMatchSnapshot();
    });
  });
});
