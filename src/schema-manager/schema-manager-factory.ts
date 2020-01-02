import ts from 'typescript/lib/tsserverlibrary';
import { SchemaManager, NoopSchemaManager } from './schema-manager';
import { FileSchemaManagerOptions, FileSchemaManager } from './file-schema-manager';
import { HttpSchemaManagerOptions, HttpSchemaManager } from './http-schema-manager';
import { SchemaManagerHost } from './types';

interface FileSchemaConfigOptions {
  file: FileSchemaManagerOptions;
}

interface HttpSchemaConfigOptions {
  http: HttpSchemaManagerOptions;
}

type SchemaConfigOptions = FileSchemaConfigOptions | HttpSchemaConfigOptions;

function isFileType(conf: SchemaConfigOptions): conf is FileSchemaConfigOptions {
  return !!(conf as any).file;
}

function isHttpType(conf: SchemaConfigOptions): conf is HttpSchemaConfigOptions {
  return !!(conf as any).http;
}

export class SchemaManagerFactory {
  constructor(private _host: SchemaManagerHost) {}

  create(): SchemaManager {
    const schemaConfig = this._host.getConfig().schema;
    let options: SchemaConfigOptions;
    if (typeof schemaConfig === 'string') {
      options = this._convertOptionsFromString(schemaConfig);
    } else {
      options = schemaConfig;
    }
    if (isFileType(options)) {
      return new FileSchemaManager(this._host, options.file);
    } else if (isHttpType(options)) {
      return new HttpSchemaManager(this._host, options.http);
    }
    return new NoopSchemaManager(this._host);
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
