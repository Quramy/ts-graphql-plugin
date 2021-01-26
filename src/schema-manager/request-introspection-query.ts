import { GraphQLSchema, buildClientSchema, getIntrospectionQuery } from 'graphql';
import { parse } from 'url';
import Http from 'http';
import Https from 'https';

const INTROSPECTION_QUERY_BODY = JSON.stringify({
  query: getIntrospectionQuery(),
});

const INTROSPECTION_QUERY_LENGTH = Buffer.byteLength(INTROSPECTION_QUERY_BODY);

export interface RequestSetup {
  url: string;
  method?: string;
  headers?: { [key: string]: string };
}

export function isRequestSetup(requestSetup: RequestSetup | any): requestSetup is RequestSetup {
  const availablePropertyNames = ['url', 'method', 'headers'];

  for (const property in requestSetup) {
    if (!availablePropertyNames.includes(property)) {
      return false;
    }
  }

  return !!requestSetup.url;
}

export function requestIntrospectionQuery(options: RequestSetup) {
  const headers: { [key: string]: string | number } = {
    'Content-Type': 'application/json',
    'Content-Length': INTROSPECTION_QUERY_LENGTH,
    'User-Agent': 'ts-graphql-plugin',
    ...options.headers,
  };

  return new Promise<GraphQLSchema>((resolve, reject) => {
    const uri = parse(options.url);

    const { method = 'POST' } = options;
    const { hostname, protocol, path } = uri;
    const port = uri.port && Number.parseInt(uri.port, 10);
    const reqParam = { hostname, protocol, path, port, headers, method };

    const requester = protocol === 'https:' ? Https.request : Http.request;
    let body = '';

    const req = requester(reqParam, res => {
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode > 300) {
          reject({
            statusCode: res.statusCode,
            body,
          });
        } else {
          let result: any;
          try {
            result = JSON.parse(body);
            resolve(buildClientSchema(result.data));
          } catch (e) {
            reject(e);
          }
        }
      });
    });

    req.on('error', reason => reject(reason));
    req.write(INTROSPECTION_QUERY_BODY);
    req.end();
  });
}
