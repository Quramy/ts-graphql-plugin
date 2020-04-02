import { SchemaManagerHost } from './types';
import { RequestSetup, isRequestSetup } from './request-introspection-query';
import { join, isAbsolute } from 'path';
import { HttpSchemaManager } from './http-schema-manager';

interface ScriptedHttpSchemaManagerOptions {
  fromScript: string;
}

export class ScriptedHttpSchemaManager extends HttpSchemaManager {
  private _scriptFileName: string;

  constructor(_host: SchemaManagerHost, options: ScriptedHttpSchemaManagerOptions) {
    super(_host);
    this._scriptFileName = options.fromScript;
    this._host.watchFile(this._getScriptFilePath(), this._configurationScriptChanged.bind(this), 100);
  }

  private _getScriptFilePath() {
    const rootPath = isAbsolute(this._host.getProjectRootPath()) ? this._host.getProjectRootPath() : process.cwd();
    return join(rootPath, this._scriptFileName);
  }

  private _requireScript(path: string) {
    delete require.cache[path];
    return require(path);
  }

  private _configurationScriptChanged() {
    this._options = null;
  }

  protected _fetchErrorOcurred() {
    this._options = null;
  }

  protected async _getOptions(): Promise<RequestSetup> {
    if (this._options !== null) {
      return this._options;
    }

    const configurationScriptPath = this._getScriptFilePath();

    if (!this._host.fileExists(configurationScriptPath)) {
      const errorMessage = `ScriptedHttpSchemaManager configuration script '${configurationScriptPath}' does not exist`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }

    const configurationScript = this._requireScript(configurationScriptPath);

    let setup = null;

    try {
      setup = await configurationScript(this._host.getProjectRootPath());
    } catch (error) {
      const errorMessage = `ScriptedHttpSchemaManager configuration script '${this._scriptFileName}' execution failed due to: ${error}`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }

    if (!isRequestSetup(setup)) {
      const errorMessage = `RequestSetup object is wrong: ${JSON.stringify(setup, null, 2)}`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }

    if (!/https?:/.test(setup.url)) {
      const errorMessage = `RequestSetup.url have to be valid url: ${setup.url}`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }

    setup.method = setup.method || 'POST';
    this._options = setup;
    return setup;
  }
}
