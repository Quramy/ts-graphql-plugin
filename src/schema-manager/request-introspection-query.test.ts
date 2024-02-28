import { http, HttpResponse, graphql } from 'msw';
import { setupServer } from 'msw/node';
import { GraphQLSchema } from 'graphql';
import { requestIntrospectionQuery } from './request-introspection-query';
import { executeTestingSchema } from './testing/testing-schema-object';

describe(requestIntrospectionQuery, () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should reject if HTTP fail', async () => {
    await expect(requestIntrospectionQuery({ url: 'http://localhost/graphql' })).rejects.toMatchObject({});
  });

  it('should reject if HTTP returns bad status', async () => {
    server.use(http.post('http://localhost/graphql', () => new Response(null, { status: 404 })));
    await expect(requestIntrospectionQuery({ url: 'http://localhost/graphql' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should reject if server returns not json', async () => {
    server.use(http.post('http://localhost/graphql', () => new Response('<html />', { status: 200 })));
    await expect(requestIntrospectionQuery({ url: 'http://localhost/graphql' })).rejects.toBeInstanceOf(SyntaxError);
  });

  it('should reject if server returns invalid introspection data', async () => {
    server.use(
      http.post('http://localhost/graphql', () =>
        HttpResponse.json({
          data: 'hoge',
          errors: null,
        }),
      ),
    );
    await expect(requestIntrospectionQuery({ url: 'http://localhost/graphql' })).rejects.toBeInstanceOf(Error);
  });

  describe('when server returns valid introspection result', () => {
    beforeEach(() => {
      server.use(
        graphql.operation(({ query, variables }) => HttpResponse.json(executeTestingSchema({ query, variables }))),
      );
    });

    it.each(['http://localhost/graphql', 'https://localhost/graphql'])('should resolve schema for %s', async url => {
      await expect(requestIntrospectionQuery({ url })).resolves.toBeInstanceOf(GraphQLSchema);
    });
  });
});
