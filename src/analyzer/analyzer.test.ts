import { Analyzer } from './analyzer';
import { createTestingLanguageServiceAndHost } from '../ts-ast-util/testing/testing-language-service';
import { createTestingSchemaManagerHost } from '../schema-manager/testing/testing-schema-manager-host';
import { SchemaManagerFactory } from '../schema-manager/schema-manager-factory';
import { TsGraphQLPluginConfig } from './types';

type CreateTestingAnalyzerOptions = {
  sdl: string;
  files?: { fileName: string; content: string }[];
  localSchemaExtension?: { fileName: string; content: string };
};

function createTestingAnalyzer({ files: sourceFiles = [], sdl, localSchemaExtension }: CreateTestingAnalyzerOptions) {
  const files = [...sourceFiles];
  files.push({ fileName: '/schema.graphql', content: sdl });
  if (localSchemaExtension) {
    files.push(localSchemaExtension);
  }
  const { languageServiceHost } = createTestingLanguageServiceAndHost({ files: sourceFiles });
  const pluginConfig: TsGraphQLPluginConfig = {
    name: 'ts-graphql-plugin',
    schema: '/schema.graphql',
    localSchemaExtensions: localSchemaExtension ? [localSchemaExtension.fileName] : [],
    removeDuplicatedFragments: true,
    tag: 'gql',
    typegen: {
      addonFactories: [],
    },
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

const noSchemaPrj = {
  sdl: '',
  files: [
    {
      fileName: 'main.ts',
      content: 'const query = gql`query MyQuery { hello }`;',
    },
  ],
};

const extensionErrorPrj = {
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
  localSchemaExtension: {
    fileName: '/extension.graphql',
    content: 'hogehoge',
  },
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

const semanticWarningPrj = {
  sdl: `
  type Query {
    hello: String! @deprecated(reason: "don't use")
  }
  `,
  files: [
    {
      fileName: 'main.ts',
      content: 'const query = gql`query MyQuery { hello }`;',
    },
  ],
};

describe(Analyzer, () => {
  describe(Analyzer.prototype.extractToManifest, () => {
    it('should extract manifest', () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      expect(analyzer.extractToManifest()).toMatchSnapshot();
    });
  });

  describe(Analyzer.prototype.validate, () => {
    it('should validate project with normal project', async () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const { errors, schema } = await analyzer.validate();
      expect(errors.length).toBe(0);
      expect(schema).toBeTruthy();
    });

    it('should report error when no schema', async () => {
      const analyzer = createTestingAnalyzer(noSchemaPrj);
      const { errors } = await analyzer.validate();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatchSnapshot();
    });

    it('should validate project with schema error project', async () => {
      const analyzer = createTestingAnalyzer(extensionErrorPrj);
      const { errors, schema } = await analyzer.validate();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatchSnapshot();
      expect(schema).toBeFalsy();
    });

    it('should validate project with semantic error project', async () => {
      const analyzer = createTestingAnalyzer(semanticErrorPrj);
      const { errors, schema } = await analyzer.validate();
      expect(errors.length).toBe(1);
      expect(schema).toBeTruthy();
    });

    it('should validate project with semantic error project', async () => {
      const analyzer = createTestingAnalyzer(semanticWarningPrj);
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

    it('should create markdown report from manifest', () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const manifestOutput = analyzer.extractToManifest();
      const [errors, output] = analyzer.report('out.md', manifestOutput[1]);
      expect(errors.length).toBe(0);
      expect(output).toMatchSnapshot();
    });
  });

  describe(Analyzer.prototype.typegen, () => {
    it('should report error when no schema', async () => {
      const analyzer = createTestingAnalyzer(noSchemaPrj);
      const { errors } = await analyzer.typegen();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatchSnapshot();
    });

    it('should create type files', async () => {
      const analyzer = createTestingAnalyzer(simpleSources);
      const { outputSourceFiles } = await analyzer.typegen();
      if (!outputSourceFiles) return fail();
      expect(outputSourceFiles.length).toBe(1);
      expect(outputSourceFiles[0].fileName.endsWith('__generated__/my-query.ts')).toBeTruthy();
      expect(outputSourceFiles[0].content).toMatchSnapshot();
    });
  });
});
