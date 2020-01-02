import { buildSchema, printSchema } from 'graphql';
import { ExtensionManager } from './extension-manager';
import { createMockSchemaManagerHost } from './testing/mock-schema-manager-host';
import { createSimpleSchema } from '../testing/graphql-util/schema/simple-schema';

function createManager(config: { localSchemaExtensions?: string[] }) {
  const host = createMockSchemaManagerHost(
    {
      schema: '',
      localSchemaExtensions: config.localSchemaExtensions,
    },
    __dirname,
  );
  return new ExtensionManager(host);
}

describe(ExtensionManager, () => {
  it('should parse and extend base schema', () => {
    const extensionManager = createManager({ localSchemaExtensions: ['./__test__/normal.graphql'] });
    const baseSchema = createSimpleSchema();
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(printSchema(schema!)).toMatchSnapshot();
    expect(extensionManager.getSchemaErrors()).toStrictEqual([]);
  });

  it('should store parser errors with invalid syntax file', () => {
    const extensionManager = createManager({ localSchemaExtensions: ['./__test__/invalid_syntax.graphql'] });
    const baseSchema = createSimpleSchema();
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(schema).toBeNull();
    const errors = extensionManager
      .getSchemaErrors()!
      .map(e => ({ ...e, fileName: e.fileName!.replace(__dirname, '') }));
    expect(errors).toMatchSnapshot();
  });

  it('should store parser errors with invalid extension', () => {
    const extensionManager = createManager({ localSchemaExtensions: ['./__test__/invalid_extension.graphql'] });
    const baseSchema = createSimpleSchema();
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(schema).toBeNull();
    const errors = extensionManager
      .getSchemaErrors()!
      .map(e => ({ ...e, fileName: e.fileName!.replace(__dirname, '') }));
    expect(errors).toMatchSnapshot();
  });
});
