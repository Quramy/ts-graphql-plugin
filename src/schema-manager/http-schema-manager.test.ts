import { ApolloServer, gql } from 'apollo-server';
import { GraphQLSchema } from 'graphql';
import { HttpSchemaManager } from './http-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';

async function createServerFixture() {
  const typeDefs = gql`
    type Query {
      hello: String!
    }
  `;
  const server = new ApolloServer({ typeDefs, mocks: true });
  await server.listen(4001);
  return server;
}

describe(HttpSchemaManager, () => {
  let server: ApolloServer;
  beforeAll(async () => {
    if (!server) {
      server = await createServerFixture();
    }
  });
  afterAll(async () => {
    if (server) {
      await server!.stop();
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
      method: 'GET',
      url: 'http://localhost:4001/invalid-path',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });
});
