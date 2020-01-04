import { GraphQLSchema } from 'graphql';
import { ExtensionManager } from './extension-manager';
import { SchemaManagerHost } from './types';

export type SchemaBuildErrorInfo = {
  message: string;
  fileName: string;
  fileContent: string;
  locations?: ReadonlyArray<{ line: number; character: number }>;
};

export type OnChangeCallback = (errors: SchemaBuildErrorInfo[] | null, schema: GraphQLSchema | null) => void;

export abstract class SchemaManager {
  private _onChanges: OnChangeCallback[];
  private _extensionManager: ExtensionManager;

  constructor(protected _host: SchemaManagerHost) {
    this._onChanges = [];
    this._extensionManager = new ExtensionManager(_host);
    this._extensionManager.readExtensions();
  }

  abstract getBaseSchema(): GraphQLSchema | null;
  protected abstract waitBaseSchema(): Promise<GraphQLSchema | null>;
  protected abstract startWatch(interval?: number): void;

  start(interval?: number) {
    this._extensionManager.startWatch(() => this.emitChange(), interval);
    this.startWatch(interval);
  }

  getSchema(): { schema: GraphQLSchema | null; errors: SchemaBuildErrorInfo[] | null } {
    const baseSchema = this.getBaseSchema();
    const schema = baseSchema && this._extensionManager.extendSchema(baseSchema);
    if (schema) {
      return { schema, errors: null };
    } else {
      return { schema: null, errors: this._extensionManager.getSchemaErrors() };
    }
  }

  async waitSchema(): Promise<{ schema: GraphQLSchema | null; errors: SchemaBuildErrorInfo[] | null }> {
    const baseSchema = await this.waitBaseSchema();
    if (!baseSchema) return { schema: null, errors: null };
    const schema = this._extensionManager.extendSchema(baseSchema);
    if (schema) {
      return { schema, errors: null };
    } else {
      return { schema: null, errors: this._extensionManager.getSchemaErrors() };
    }
  }

  registerOnChange(cb: OnChangeCallback) {
    this._onChanges.push(cb);
    return () => {
      this._onChanges = this._onChanges.filter(x => x !== cb);
    };
  }

  protected emitChange() {
    const { errors, schema } = this.getSchema();
    this._onChanges.forEach(cb => cb(errors, schema));
  }

  protected log(msg: string) {
    this._host.log(msg);
  }
}

export class NoopSchemaManager extends SchemaManager {
  startWatch() {}

  async waitBaseSchema() {
    return null;
  }

  getBaseSchema() {
    return null;
  }
}
