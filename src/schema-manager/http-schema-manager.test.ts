import { graphqlSync, GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { graphql, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HttpSchemaManager } from './http-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';

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

const schemaHandler = graphql.operation(({ query, variables }) => {
  return HttpResponse.json(
    graphqlSync({
      schema,
      source: query,
      variableValues: variables,
    }),
  );
});

describe(HttpSchemaManager, () => {
  const server = setupServer();

  beforeAll(() =>
    server.listen({
      onUnhandledRequest: () => null,
    }),
  );

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('should return null if request fail', async () => {
    server.use(http.get('/grapql', () => new Response(null, { status: 404 })));
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'GET' as any,
      url: '/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should return null if content type of the reposonse is not JSON', async () => {
    server.use(http.post('/graphql', () => HttpResponse.text('<html />')));
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: '/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should return null if JSON response is not introspection result', async () => {
    server.use(http.post('/graphql', () => HttpResponse.json({ hoge: 'hoge' })));
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: '/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should get schema from GraphQL server', async () => {
    server.use(schemaHandler);
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: '/graphql',
    });
    const lazySchema = new Promise(res => manager.registerOnChange(() => res(manager.getBaseSchema())));
    manager.startWatch();
    await expect(lazySchema).resolves.toBeInstanceOf(GraphQLSchema);
  });

  it('should wait for base schema from GraphQL server', async () => {
    server.use(schemaHandler);
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: '/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });

  it('should retry to fetch', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: '/graphql',
    });
    manager.startWatch(50);
    await new Promise(res => setTimeout(res, 50));
    expect(manager.getBaseSchema()).toBeNull();
    server.use(schemaHandler);
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
