import { buildSchema } from 'graphql';
import { TypeGenerator } from './type-generator';
import { createTesintExtractor } from './testing/testing-extractor';
import { ExtractSucceededResult } from './extractor';
import { TypeGenAddonFactory } from '../typegen/addon/types';
import { createOutputSource } from '../ts-ast-util';

function createTestingTypeGenerator({
  files = [],
  addonFactories = [],
}: {
  files?: { fileName: string; content: string }[];
  addonFactories?: TypeGenAddonFactory[];
}) {
  const extractor = createTesintExtractor(files, true);
  const generator = new TypeGenerator({
    prjRootPath: '',
    tag: undefined,
    addonFactories,
    extractor,
    debug: () => {},
  });
  return { generator, extractor };
}

describe(TypeGenerator, () => {
  const schema = buildSchema(`type Query { hello: String! }`);
  describe(TypeGenerator.prototype.createAddon, () => {
    it('should create context for type-generator add on', () => {
      const { generator, extractor } = createTestingTypeGenerator({
        files: [
          {
            fileName: 'main.ts',
            content: 'export query = `query MyQuery { hello }`;',
          },
        ],
      });
      const result = extractor.extract(['main.ts']) as ExtractSucceededResult[];
      const { addon, context } = generator.createAddon({
        extractedResult: result[0],
        schema,
        outputSource: createOutputSource({ outputFileName: 'my-query.ts' }),
      });
      expect(context.extractedInfo.fileName).toBe('main.ts');
      expect(context.extractedInfo.tsSourceFile).toBeTruthy();
      expect(context.source.outputFileName).toBe('my-query.ts');
      expect(addon).toBeTruthy();
    });
  });

  describe(TypeGenerator.prototype.generateTypes, () => {
    it('should create type files', () => {
      const { generator } = createTestingTypeGenerator({
        files: [
          {
            fileName: 'main.ts',
            content: 'const query = gql`query MyQuery { hello }`;',
          },
        ],
      });
      const { outputSourceFiles } = generator.generateTypes({
        files: ['main.ts'],
        schema,
      });
      if (!outputSourceFiles) return fail();
      expect(outputSourceFiles.length).toBe(1);
      expect(outputSourceFiles[0].fileName.endsWith('__generated__/my-query.ts')).toBeTruthy();
      expect(outputSourceFiles[0].content).toMatchSnapshot();
    });

    it('should ignore complex operations document', () => {
      const { generator } = createTestingTypeGenerator({
        files: [
          {
            fileName: 'main.ts',
            content: `
              const query = gql\`
                query MyQuery {
                  hello
                }
                mutation MyMutaion {
                  bye
                }
              \`;
            `,
          },
        ],
      });
      const { outputSourceFiles, errors } = generator.generateTypes({
        files: ['main.ts'],
        schema,
      });
      if (!outputSourceFiles) return fail();
      expect(outputSourceFiles.length).toBe(0);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatchSnapshot();
    });

    it('should report errors occuring in typegen visitor', async () => {
      const { generator } = createTestingTypeGenerator({
        files: [
          {
            fileName: 'main.ts',
            content: 'const query = gql`query MyQuery { goodBye }`;',
          },
        ],
      });
      const { outputSourceFiles, errors } = generator.generateTypes({
        files: ['main.ts'],
        schema,
      });
      if (!outputSourceFiles) return fail();
      expect(outputSourceFiles.length).toBe(0);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatchSnapshot();
    });
  });
});
