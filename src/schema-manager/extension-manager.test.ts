import fs from 'fs';
import path from 'path';
import { buildSchema, printSchema } from 'graphql';
import { ExtensionManager } from './extension-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';

function createManagerWithHost(config: { localSchemaExtensions: string[] }) {
  const host = createTestingSchemaManagerHost({
    schema: '',
    localSchemaExtensions: config.localSchemaExtensions,
    files: config.localSchemaExtensions.map(name => ({
      fileName: path.join(__dirname, name),
      content: fs.readFileSync(path.join(__dirname, name), 'utf-8'),
    })),
    prjRootPath: __dirname,
  });
  return { extensionManager: new ExtensionManager(host), host };
}

function createManager(config: { localSchemaExtensions: string[] }) {
  return createManagerWithHost(config).extensionManager;
}

const baseSdl = `
  type Query {
    hello: String!
  }
`;

const baseSchema = buildSchema(baseSdl);

describe(ExtensionManager, () => {
  it('should parse and extend base schema', () => {
    const extensionManager = createManager({ localSchemaExtensions: ['./testing/resources/normal.graphql'] });
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(printSchema(schema!)).toMatchSnapshot();
    expect(extensionManager.getSchemaErrors()).toStrictEqual([]);
  });

  it('should store parser errors with invalid syntax file', () => {
    const extensionManager = createManager({ localSchemaExtensions: ['./testing/resources/invalid_syntax.graphql'] });
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(schema).toBeNull();
    const errors = extensionManager
      .getSchemaErrors()!
      .map(e => ({ ...e, fileName: e.fileName!.replace(__dirname, '') }));
    expect(errors).toMatchSnapshot();
  });

  it('should store parser errors with invalid extension', () => {
    const extensionManager = createManager({
      localSchemaExtensions: ['./testing/resources/invalid_extension.graphql'],
    });
    extensionManager.readExtensions();
    const schema = extensionManager.extendSchema(baseSchema);
    expect(schema).toBeNull();
    const errors = extensionManager
      .getSchemaErrors()!
      .map(e => ({ ...e, fileName: e.fileName!.replace(__dirname, '') }));
    expect(errors).toMatchSnapshot();
  });

  it('should execute call back when files change', async () => {
    const { extensionManager, host } = createManagerWithHost({
      localSchemaExtensions: ['./testing/resources/normal.graphql'],
    });
    const called = new Promise<void>(res => extensionManager.startWatch(res));
    host.updateFile(path.join(__dirname, 'testing/resources/normal.graphql'), '');
    await called;
  });
});
