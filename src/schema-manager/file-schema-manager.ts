import path = require('path');
import * as ts from 'typescript/lib/tsserverlibrary';

export class FileSchemaManager {
  private _schemaPath: string;
  private _watcher: ts.FileWatcher;
  private _onChanges: Array<(schema: any) => void> = [];

  constructor(private _info: ts.server.PluginCreateInfo) {
    this._schemaPath = this._info.config.schema;
  }

  getSchema() {
    if (!this._schemaPath || typeof this._schemaPath !== 'string') return;
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._info.project.getProjectRootPath(), this._schemaPath);
      this._log('Read schema from ' + resolvedSchmaPath);
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

  registerOnChange(cb: (schema: any) => void) {
    this._onChanges.push(cb);
    return () => {
      this._onChanges = this._onChanges.filter(x => x !== cb);
    };
  }

  startWatch(interval: number = 100) {
    try {
      const resolvedSchmaPath = this.getAbsoluteSchemaPath(this._info.project.getProjectRootPath(), this._schemaPath);
      this._watcher = this._info.serverHost.watchFile(resolvedSchmaPath, () => {
        this._log('Change schema file.');
        if (this._onChanges.length) {
          const schema = this.getSchema();
          if (schema) this._onChanges.forEach(cb => cb(schema));
        }
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

  private _log(msg: string) {
    this._info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  }

}
