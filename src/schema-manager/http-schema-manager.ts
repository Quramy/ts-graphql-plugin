import { SchemaManager } from './schema-manager';
import { SchemaManagerHost } from './types';
import { requestIntrospectionQuery, RequestSetup } from './request-introspection-query';

export class HttpSchemaManager extends SchemaManager {
  private _schema: any = null;

  constructor(_host: SchemaManagerHost, protected _options: RequestSetup | null = null) {
    super(_host);
  }

  protected async _getOptions(): Promise<RequestSetup | null> {
    return this._options;
  }

  protected _fetchErrorOcurred(): void {}

  getBaseSchema() {
    return this._schema;
  }

  async waitBaseSchema() {
    try {
      const options = await this._getOptions();

      if (options === null) {
        return null;
      }

      return await requestIntrospectionQuery(options);
    } catch (error) {
      return null;
    }
  }

  startWatch(interval: number = 1000) {
    const makeRequest = async (backoff = interval) => {
      let options;

      try {
        options = await this._getOptions();
      } catch (error) {
        setTimeout(makeRequest, backoff * 2.0);
        return;
      }

      if (options === null) {
        this.log(`Options cannot be null`);
        setTimeout(makeRequest, backoff * 2.0);
        return;
      }

      try {
        const query = await requestIntrospectionQuery(options);

        this.log(`Fetch schema data from ${options.url}.`);

        if (query) {
          this._schema = query;
          this.emitChange();
        }

        setTimeout(makeRequest, interval);
      } catch (reason) {
        this.log(`Fail to fetch schema data from ${options.url} via:`);
        this.log(`${JSON.stringify(reason, null, 2)}`);

        this._fetchErrorOcurred();
        setTimeout(makeRequest, backoff * 2.0);
      }
    };

    makeRequest();
  }
}
