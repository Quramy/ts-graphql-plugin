import path from 'path';
import ts from 'typescript/lib/tsserverlibrary';
import { buildSchema, buildClientSchema } from 'graphql';

import { SchemaManager } from './schema-manager';
import { SchemaManagerHost } from './types';

function extractIntrospectionContentFromJson(jsonObject: any) {
  if (jsonObject.data) {
    return jsonObject.data;
  } else {
    return jsonObject;
  }
}

export interface FileSchemaManagerOptions {
  path: string;
}

export class FileSchemaManager extends SchemaManager {
  private _schemaPath: string;
  private _watcher?: ts.FileWatcher;

  constructor(protected _host: SchemaManagerHost, options: FileSchemaManagerOptions) {
    super(_host);
    this._schemaPath = options.path;
  }

  getBaseSchema() {
    if (!this._schemaPath || typeof this._schemaPath !== 'string') return null;
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._host.getProjectRootPath(), this._schemaPath);
      this.log('Read schema from ' + resolvedSchmaPath);
      const isExists = this._host.fileExists(resolvedSchmaPath);
      if (!isExists) return null;
      if (this._schemaPath.endsWith('.graphql') || this._schemaPath.endsWith('.gql')) {
        const sdl = this._host.readFile(resolvedSchmaPath, 'utf-8');
        return sdl ? buildSchema(sdl) : null;
      } else {
        const introspectionContents = this._host.readFile(resolvedSchmaPath, 'utf-8');
        return introspectionContents
          ? buildClientSchema(extractIntrospectionContentFromJson(JSON.parse(introspectionContents)))
          : null;
      }
    } catch (err) {
      this.log('Fail to read schema file...');
      this.log(err instanceof Error ? err.message : `Unknown error: ${err}`);
      return null;
    }
  }

  async waitBaseSchema() {
    return this.getBaseSchema();
  }

  getAbsoluteSchemaPath(projectRootPath: string, schemaPath: string) {
    if (path.isAbsolute(schemaPath)) return schemaPath;
    return path.resolve(projectRootPath, schemaPath);
  }

  startWatch(interval: number = 100) {
    const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._host.getProjectRootPath(), this._schemaPath);
    this._watcher = this._host.watchFile(
      resolvedSchmaPath,
      () => {
        this.log('Change schema file.');
        this.emitChange();
      },
      interval,
    );
  }

  closeWatch() {
    if (this._watcher) this._watcher.close();
  }
}
