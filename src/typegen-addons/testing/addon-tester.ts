import { buildSchema } from 'graphql';

import { TypeGenAddonFactory } from '../../typegen';
import { createTesintExtractor } from '../../analyzer/testing/testing-extractor';
import { TypeGenerator } from '../../analyzer/type-generator';

function createTestingTypeGenerator({
  files = [],
  tag = '',
  addonFactories = [],
}: {
  files?: { fileName: string; content: string }[];
  tag?: string;
  addonFactories?: TypeGenAddonFactory[];
}) {
  const extractor = createTesintExtractor(files, true);
  const generator = new TypeGenerator({
    prjRootPath: '',
    tag,
    addonFactories,
    extractor,
    debug: () => {},
  });
  return generator;
}

type InputFile = { fileName: string; content: string };

class AddonTester {
  constructor(private readonly facory: TypeGenAddonFactory, private readonly options: { tag?: string }) {}

  generateTypes({ files, schemaSDL }: { files: InputFile[]; schemaSDL: string }) {
    const schema = buildSchema(schemaSDL);
    const generator = createTestingTypeGenerator({ files, addonFactories: [this.facory], tag: this.options.tag });
    const { errors, outputSourceFiles } = generator.generateTypes({ files: files.map(f => f.fileName), schema });
    return { errors, outputSourceFiles };
  }
}

export function createAddonTester(factory: TypeGenAddonFactory, options: { tag?: string } = {}) {
  return new AddonTester(factory, options);
}
