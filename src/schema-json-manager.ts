import * as ts from 'typescript/lib/tsserverlibrary';

export class SchamaJsonManager {
  private _schemaPath: string;
  private _watcher: ts.FileWatcher;
  private _onChanges: Array<(schema: any) => void> = [];

  constructor(private _info: ts.server.PluginCreateInfo) {
    this._schemaPath = this._info.config.schema;
  }

  getSchema() {
    if (!this._schemaPath || typeof this._schemaPath !== 'string') return;
    try {
      const isExists = this._info.languageServiceHost.fileExists(this._schemaPath);
      if (!isExists) return;
      return JSON.parse(this._info.languageServiceHost.readFile(this._schemaPath, 'utf-8'));
    } catch (e) {
      this._log('Fail to read schema file...');
      this._log(e.message);
      return;
    }
  }

  registerOnChange(cb: (schema: any) => void) {
    this._onChanges.push(cb);
    return () => {
      this._onChanges.filter(x => x !== cb);
    };
  }

  startWatch(interval: number = 100) {
    try {
      this._watcher = this._info.serverHost.watchFile(this._schemaPath, () => {
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
    this._info.project.projectService.logger.info(msg);
  }

}
