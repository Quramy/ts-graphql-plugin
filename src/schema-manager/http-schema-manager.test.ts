import { setTimeout } from 'node:timers/promises';
import { graphql, http, HttpResponse } from 'msw';
import { GraphQLSchema } from 'graphql';
import { setupServer } from 'msw/node';
import { HttpSchemaManager } from './http-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';
import { executeTestingSchema } from './testing/testing-schema-object';

const schemaHandler = graphql.operation(({ query, variables }) => {
  return HttpResponse.json(executeTestingSchema({ query, variables }));
});

describe(HttpSchemaManager, () => {
  const server = setupServer();

  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('should return null if request fail', async () => {
    server.use(http.post('http://localhost/graphql', () => new Response(null, { status: 500 })));
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      url: 'http://localhost/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeNull();
  });

  it('should get schema from GraphQL server', async () => {
    server.use(schemaHandler);
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost/graphql',
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
      url: 'http://localhost/graphql',
    });
    const schema = await manager.waitBaseSchema();
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });

  it('should retry to fetch', async () => {
    const schemaManagerHost = createTestingSchemaManagerHost({ schema: '' });
    const manager = new HttpSchemaManager(schemaManagerHost, {
      method: 'POST',
      url: 'http://localhost/graphql',
    });

    server.use(http.post('http://localhost/graphql', () => new Response(null, { status: 401 }), { once: true }));

    manager.startWatch(50);
    await setTimeout(50);

    expect(manager.getBaseSchema()).toBeNull();
    server.use(schemaHandler);

    await setTimeout(32);
    const schema = await manager.waitBaseSchema();

    expect(schema).toBeInstanceOf(GraphQLSchema);
  });
});
