import { SchemaManagerHost } from './types';
import { RequestSetup, isRequestSetup } from './request-introspection-query';
import { join } from 'path';
import { HttpSchemaManager } from './http-schema-manager';

interface ScriptedHttpSchemaManagerOptions {
  fromScript: string;
}

export class ScriptedHttpSchemaManager extends HttpSchemaManager {
  private _scriptFile: string;

  constructor(_host: SchemaManagerHost, options: ScriptedHttpSchemaManagerOptions) {
    super(_host);
    this._scriptFile = options.fromScript;
  }

  private _requireScript(path: string) {
    return require(path);
  }

  protected async _getOptions(): Promise<RequestSetup> {
    if (this._options !== null) {
      return this._options;
    }

    const configurationScriptPath = join(this._host.getProjectRootPath(), this._scriptFile);

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
      const errorMessage = `ScriptedHttpSchemaManager configuration script '${this._scriptFile}' execution failed due to: ${error}`;
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

    this._options = setup;
    return setup;
  }
}
