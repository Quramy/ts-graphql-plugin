import ts from 'typescript';
import { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';
import { TsGraphQLPluginConfigOptions } from '../types';
// import { SchemaManager } from "../schema-manager/schema-manager";

export class Analyzer {
  // private _schemaManager: SchemaManager;
  private _extractor: Extractor;
  private _scriptSourceHelper: ScriptSourceHelper;

  constructor(
    private _pluginConfig: TsGraphQLPluginConfigOptions,
    private _languageServiceHost: ts.LanguageServiceHost,
  ) {
    const langService = ts.createLanguageService(this._languageServiceHost);
    this._scriptSourceHelper = createScriptSourceHelper({
      languageService: langService,
      languageServiceHost: this._languageServiceHost,
    });
    this._extractor = new Extractor({ scriptSourceHelper: this._scriptSourceHelper });
  }

  extract() {
    const results = this._extractor.extract(this._languageServiceHost.getScriptFileNames(), this._pluginConfig.tag);
    const errors = this._extractor.pickupErrors(results);
    const manifest = this._extractor.toManifest(results, this._pluginConfig.tag);
    return [errors, manifest] as const;
  }
}
