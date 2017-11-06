import * as path from 'path';
import * as ts from 'typescript/lib/tsserverlibrary';
import { SchemaManager } from './schema-manager';

export interface FileSchemaManagerOptions {
  path: string;
}

export class FileSchemaManager extends SchemaManager {
  private _schemaPath: string;
  private _watcher: ts.FileWatcher;

  constructor(_info: ts.server.PluginCreateInfo, options: FileSchemaManagerOptions) {
    super(_info);
    this._schemaPath = options.path;
  }

  getSchema() {
    if (!this._schemaPath || typeof this._schemaPath !== 'string') return;
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._getProjectRootPath(this._info), this._schemaPath);
      this.log('Read schema from ' + resolvedSchmaPath);
      const isExists = this._info.languageServiceHost.fileExists(resolvedSchmaPath);
      if (!isExists) return;
      return JSON.parse(this._info.languageServiceHost.readFile(resolvedSchmaPath, 'utf-8'));
    } catch (e) {
      this._log('Fail to read schema file...');
      this._log(e.message);
      return;
    }
  }

  getAbsoluteSchemaPath(projectRootPath: string, schemaPath: string) {
    if (path.isAbsolute(schemaPath)) return schemaPath;
    return path.resolve(projectRootPath, schemaPath);
  }

  startWatch(interval: number = 100) {
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._getProjectRootPath(this._info), this._schemaPath);
      this._watcher = this._info.serverHost.watchFile(resolvedSchmaPath, () => {
        this._log('Change schema file.');
        this.emitChange();
      }, interval);
    } catch (e) {
      this._log('Fail to read schema file...');
      this._log(e.message);
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

  private _log(msg: string) {
    this._info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  }

}
