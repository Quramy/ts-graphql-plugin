import { Server } from 'http';
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { HttpSchemaManager } from './http-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';

function createServerFixture() {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: {
        hello: {
          type: GraphQLString,
          resolve() {
            return 'world';
          },
        },
      },
    }),
  });
  const app = express();
  app.post('/invalid-path', (_, res) => res.status(404).end());
  app.post('/invalid-json', (_, res) => res.status(200).end('text'));
  app.post('/invalid-schema', (_, res) => res.json({ hoge: 'hoge' }).status(200).end());
  app.post('/graphql', graphqlHTTP({ schema, graphiql: false }));
  return new Promise<Server>(res => {
    const server = app.listen(4001, () => res(server));
  });
}

describe(HttpSchemaManager, () => {
  let server: Server;
  beforeAll(async () => {
    if (!server) {
      server = await createServerFixture();
    }
  });
  afterAll(async () => {
    if (server) {
      await new Promise(res => server!.close(res));
    }
  });

  it('should get schema from GraphQL server', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost:4001/graphql',
    });
    const lazySchema = new Promise(res => manager.registerOnChange(() => res(manager.getBaseSchema())));
    manager.startWatch();
    expect(await lazySchema).toBeInstanceOf(GraphQLSchema);
  });

  it('should wait for base schema from GraphQL server', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost:4001/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });

  it('should return null if request fail', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'GET' as any,
      url: 'http://localhost:4001/invalid-path',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should return null if content type of the reposonse is not JSON', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost:4001/invalid-json',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should return null if JSON response is not introspection result', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost:4001/invalid-schema',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should retry to fetch', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost:4001/graphql',
    });
    await new Promise(res => server!.close(res));
    manager.startWatch(50);
    await new Promise(res => setTimeout(res, 50));
    expect(manager.getBaseSchema()).toBeNull();
    server = await createServerFixture();
    const schema = await new Promise(res => {
      const getSchema = () =>
        setTimeout(() => {
          const s = manager.getBaseSchema();
          if (s) res(s);
          getSchema();
        }, 32);
      getSchema();
    });
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });
});
