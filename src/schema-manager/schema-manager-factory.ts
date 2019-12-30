import * as ts from 'typescript/lib/tsserverlibrary';
import { SchemaManager } from './schema-manager';
import { FileSchemaManagerOptions, FileSchemaManager } from './file-schema-manager';
import { HttpSchemaManagerOptions, HttpSchemaManager } from './http-schema-manager';

export interface FileSchemaConfigOptions {
  file: FileSchemaManagerOptions;
}

export interface HttpSchemaConfigOptions {
  http: HttpSchemaManagerOptions;
}

export type SchemaConfigOptions = FileSchemaConfigOptions | HttpSchemaConfigOptions;

export function isFileType(conf: SchemaConfigOptions): conf is FileSchemaConfigOptions {
  return !!(conf as any).file;
}

export function isHttpType(conf: SchemaConfigOptions): conf is HttpSchemaConfigOptions {
  return !!(conf as any).http;
}

export type SchemaConfig = string | SchemaConfigOptions;

export class SchemaManagerFactory {
  constructor(private _info: ts.server.PluginCreateInfo) {}

  create(): SchemaManager | null {
    const schemaConfig = this._info.config.schema as SchemaConfig;
    let options: SchemaConfigOptions;
    if (typeof schemaConfig === 'string') {
      options = this._convertOptionsFromString(schemaConfig);
    } else {
      options = schemaConfig;
    }
    if (isFileType(options)) {
      return new FileSchemaManager(this._info, options.file);
    } else if (isHttpType(options)) {
      return new HttpSchemaManager(this._info, options.http);
    }
    return null;
  }

  _convertOptionsFromString(path: string): SchemaConfigOptions {
    if (/https?/.test(path)) {
      return {
        http: {
          url: path,
        } as HttpSchemaManagerOptions,
      };
    } else {
      return {
        file: {
          path,
        } as FileSchemaManagerOptions,
      };
    }
  }
}
