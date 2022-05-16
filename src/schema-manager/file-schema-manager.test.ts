import { GraphQLSchema, graphql, buildSchema } from 'graphql';
import { getIntrospectionQuery } from 'graphql/utilities';
import { FileSchemaManager } from './file-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';

function createManagerWithHost(path: string, content: string) {
  const host = createTestingSchemaManagerHost({
    schema: '',
    prjRootPath: '/',
    files: [
      {
        fileName: '/' + path,
        content,
      },
    ],
  });
  const manager = new FileSchemaManager(host, { path });
  return { manager, host };
}

describe(FileSchemaManager, () => {
  it('should provide base schema from SDL file', async () => {
    const sdl = `
      type Query {
        hello: String!
      }
    `;
    const { manager } = createManagerWithHost('schema.graphql', sdl);
    expect(await manager.waitBaseSchema()).toBeInstanceOf(GraphQLSchema);
  });

  it('should provide base schema from introspection query result', async () => {
    const sdl = `
      type Query {
        hello: String!
      }
    `;
    const introspectionResult = await graphql({ schema: buildSchema(sdl), source: getIntrospectionQuery() });
    const { manager } = createManagerWithHost('schema.json', JSON.stringify(introspectionResult.data));
    expect(await manager.waitBaseSchema()).toBeInstanceOf(GraphQLSchema);
  });

  it('should provide base schema from JSON object whose data is introspection query result', async () => {
    const sdl = `
      type Query {
        hello: String!
      }
    `;
    const introspectionResult = await graphql({ schema: buildSchema(sdl), source: getIntrospectionQuery() });
    const { manager } = createManagerWithHost('schema.json', JSON.stringify(introspectionResult));
    expect(await manager.waitBaseSchema()).toBeInstanceOf(GraphQLSchema);
  });

  it('should return null as getBaseSchema() when invalid JSON', async () => {
    const { manager } = createManagerWithHost('schema.json', '{ ');
    expect(await manager.waitBaseSchema()).toBeNull();
  });

  it('should update when schema changes', async () => {
    const sdl = `
      type Query {
        hello: String!
      }
    `;
    const { manager, host } = createManagerWithHost('schema.graphql', sdl);
    const lazySchema = new Promise(res => manager.registerOnChange(() => res(manager.getBaseSchema())));
    manager.startWatch();
    const newContent = `
      type Query {
        hello: Int!
      }
    `;
    host.updateFile('/schema.graphql', newContent);
    expect(await lazySchema).toBeInstanceOf(GraphQLSchema);
  });
});
