import { SchemaManagerHost } from './types';
import { SchemaManager, NoopSchemaManager } from './schema-manager';
import { FileSchemaManagerOptions, FileSchemaManager } from './file-schema-manager';
import { HttpSchemaManager } from './http-schema-manager';
import { ScriptedHttpSchemaManager } from './scripted-http-schema-manager';
import { RequestSetup } from './request-introspection-query';

interface FileSchemaConfigOptions {
  file: FileSchemaManagerOptions;
}

interface HttpSchemaConfigOptions {
  http: RequestSetup;
}

interface ScriptedHttpSchemaManagerOptions {
  http: {
    fromScript: string;
  };
}

type SchemaConfigOptions = FileSchemaConfigOptions | HttpSchemaConfigOptions | ScriptedHttpSchemaManagerOptions;

function isFileType(conf: SchemaConfigOptions): conf is FileSchemaConfigOptions {
  return !!(conf as any).file;
}

function isHttpType(conf: SchemaConfigOptions): conf is HttpSchemaConfigOptions {
  return !!(conf as any).http?.url;
}

function isScriptedHttpType(conf: SchemaConfigOptions): conf is ScriptedHttpSchemaManagerOptions {
  return !!(conf as any).http?.fromScript;
}

export class SchemaManagerFactory {
  constructor(private _host: SchemaManagerHost) {}

  create(): SchemaManager {
    const schemaConfig = this._host.getConfig().schema;
    let options: SchemaConfigOptions;

    if (typeof schemaConfig === 'string') {
      options = this._convertOptionsFromString(schemaConfig);
    } else {
      options = schemaConfig as SchemaConfigOptions;
    }

    if (isFileType(options)) {
      return new FileSchemaManager(this._host, options.file);
    } else if (isHttpType(options)) {
      return new HttpSchemaManager(this._host, options.http);
    } else if (isScriptedHttpType(options)) {
      return new ScriptedHttpSchemaManager(this._host, options.http);
    }

    return new NoopSchemaManager(this._host);
  }

  _convertOptionsFromString(path: string): SchemaConfigOptions {
    if (/https?/.test(path)) {
      return {
        http: {
          url: path,
        } as RequestSetup,
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
