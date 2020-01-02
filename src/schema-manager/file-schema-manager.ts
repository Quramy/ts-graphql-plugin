import path from 'path';
import ts from 'typescript/lib/tsserverlibrary';
import { SchemaManager } from './schema-manager';
import { buildSchema, buildClientSchema } from 'graphql';

export interface FileSchemaManagerOptions {
  path: string;
}

export class FileSchemaManager extends SchemaManager {
  private _schemaPath: string;
  private _watcher?: ts.FileWatcher;

  constructor(_info: ts.server.PluginCreateInfo, options: FileSchemaManagerOptions) {
    super(_info);
    this._schemaPath = options.path;
  }

  getBaseSchema() {
    if (!this._schemaPath || typeof this._schemaPath !== 'string') return null;
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._getProjectRootPath(this._info), this._schemaPath);
      this.log('Read schema from ' + resolvedSchmaPath);
      if (!this._info.languageServiceHost.fileExists || !this._info.languageServiceHost.readFile) {
        throw new Error('for this plugin, languageServiceHost should has readFile and fileExists method');
      }
      const isExists = this._info.languageServiceHost.fileExists(resolvedSchmaPath);
      if (!isExists) return null;
      if (this._schemaPath.endsWith('.graphql') || this._schemaPath.endsWith('.gql')) {
        const sdl = this._info.languageServiceHost.readFile(resolvedSchmaPath, 'utf-8');
        return sdl ? buildSchema(sdl) : null;
      } else {
        const introspectionContents = this._info.languageServiceHost.readFile(resolvedSchmaPath, 'utf-8');
        return introspectionContents ? buildClientSchema(JSON.parse(introspectionContents).data) : null;
      }
    } catch (e) {
      this.log('Fail to read schema file...');
      this.log(e.message);
      return null;
    }
  }

  getAbsoluteSchemaPath(projectRootPath: string, schemaPath: string) {
    if (path.isAbsolute(schemaPath)) return schemaPath;
    return path.resolve(projectRootPath, schemaPath);
  }

  startWatch(interval: number = 100) {
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._getProjectRootPath(this._info), this._schemaPath);
      this._watcher = this._info.serverHost.watchFile(
        resolvedSchmaPath,
        () => {
          this.log('Change schema file.');
          this.emitChange();
        },
        interval,
      );
    } catch (e) {
      this.log('Fail to read schema file...');
      this.log(e.message);
      return;
    }
  }

  closeWatch() {
    if (this._watcher) this._watcher.close();
  }

  private _getProjectRootPath(info: ts.server.PluginCreateInfo) {
    const { project } = info;
    if (typeof (project as any).getProjectRootPath === 'function') {
      return (project as any).getProjectRootPath();
    }
    return path.dirname(project.getProjectName());
  }
}
