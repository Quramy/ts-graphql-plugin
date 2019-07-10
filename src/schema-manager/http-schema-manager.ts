import { Buffer } from 'buffer';
import { parse } from 'url';
import * as Http from 'http';
import * as Https from 'https';
import * as ts from 'typescript/lib/tsserverlibrary';
import { buildClientSchema } from 'graphql';
import { introspectionQuery } from 'graphql/utilities';
import { SchemaManager } from './schema-manager';

const INTROSPECTION_QUERY_BODY = JSON.stringify({
  query: introspectionQuery,
});

const INTROSPECTION_QUERY_LENGTH = Buffer.byteLength(INTROSPECTION_QUERY_BODY);

export interface HttpSchemaManagerOptions {
  url: string;
  method?: 'POST'; // TODO
  headers?: { [key: string]: string };
}

export class HttpSchemaManager extends SchemaManager {

  static request(options: HttpSchemaManagerOptions) {
    const headers: { [key: string]: string | number } = {
      'Content-Type': 'application/json',
      'Content-Length': INTROSPECTION_QUERY_LENGTH,
      'User-Agent': 'ts-graphql-plugin',
      ...options.headers,
    };
    return new Promise((resolve, reject) => {
      const uri = parse(options.url);
      let body = '';
      const r = uri.protocol === 'https:' ? Https.request : Http.request;
      const req = r({
        hostname: uri.hostname,
        protocol: uri.protocol,
        path: uri.path,
        port: Number.parseInt(uri.port, 10),
        headers,
        method: options.method,
      }, res => {
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode > 300) {
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
      req.on('error', reason => {
        reject(reason);
      });
      req.write(INTROSPECTION_QUERY_BODY);
      req.end();
    });
  }

  private _schema: any = null;

  constructor(
    _info: ts.server.PluginCreateInfo,
    private _options: HttpSchemaManagerOptions,
  ) {
    super(_info);
  }

  getSchema() {
    return this._schema;
  }

  startWatch(interval: number = 1000) {
    const request = (backoff = interval) => {
      HttpSchemaManager.request(this._options).then(data => {
        this.log(`Fetch schema data from ${this._options.url}.`);
        if (this._shouldUpdate(data)) {
          this._schema = data;
          this.log(`Updated with: ${JSON.stringify(data)}`);
          this.emitChange();
        }
        setTimeout(request, interval);
      }).catch(reason => {
        this.log(`Fail to fetch schema data from ${this._options.url} via:`);
        this.log(`${JSON.stringify(reason, null, 2)}`);
        setTimeout(request, backoff * 2.0);
      });
    };
    request();
  }

  _shouldUpdate(newSchama: any) {
    if (!this._schema) {
      if (newSchama) return true;
      return false;
    }
    if (!newSchama) return false;
    return JSON.stringify(this._schema) !== JSON.stringify(newSchama);
  }

}
