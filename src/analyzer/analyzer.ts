import ts from 'typescript';
import path from 'path';
import { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import { createScriptSourceHelper } from '../ts-ast-util';
import { SchemaManager, SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { TsGqlError, ErrorWithLocation, ErrorWithoutLocation } from '../errors';
import { location2pos } from '../string-util';
import { validate } from './validator';
import { ManifestOutput, TsGraphQLPluginConfig } from './types';
import { MarkdownReporter } from './markdown-reporter';
import { TypeGenerator } from './type-generator';

class TsGqlConfigError extends ErrorWithoutLocation {
  constructor() {
    const message =
      'No GraphQL schema. Confirm your ts-graphql-plugin\'s "schema" configuration at tsconfig.json\'s compilerOptions.plugins section.';
    super(message);
  }
}

export function convertSchemaBuildErrorsToErrorWithLocation(errorInfo: SchemaBuildErrorInfo) {
  const fileName = errorInfo.fileName;
  const content = errorInfo.fileContent;
  if (errorInfo.locations && errorInfo.locations[0]) {
    const start = location2pos(errorInfo.fileContent, errorInfo.locations[0]);
    const end = start + 1;
    const errorContent = { fileName, content, start, end };
    return new ErrorWithLocation(errorInfo.message, errorContent);
  } else {
    const start = 0;
    const end = content.length - 1;
    const errorContent = { fileName, content, start, end };
    return new ErrorWithLocation(errorInfo.message, errorContent);
  }
}

export class Analyzer {
  private _extractor: Extractor;
  private _scriptSourceHelper: ScriptSourceHelper;
  private _typeGenerator: TypeGenerator;

  constructor(
    private readonly _pluginConfig: TsGraphQLPluginConfig,
    private readonly _prjRootPath: string,
    private readonly _languageServiceHost: ts.LanguageServiceHost,
    private readonly _schemaManager: SchemaManager,
    private readonly _debug: (msg: string) => void,
  ) {
    const langService = ts.createLanguageService(this._languageServiceHost);
    this._scriptSourceHelper = createScriptSourceHelper({
      languageService: langService,
      languageServiceHost: this._languageServiceHost,
    });
    this._extractor = new Extractor({
      removeDuplicatedFragments: this._pluginConfig.removeDuplicatedFragments === false ? false : true,
      scriptSourceHelper: this._scriptSourceHelper,
      debug: this._debug,
    });
    this._typeGenerator = new TypeGenerator({
      prjRootPath: this._prjRootPath,
      extractor: this._extractor,
      tag: this._pluginConfig.tag,
      addonFactories: this._pluginConfig.typegen.addonFactories,
      debug: this._debug,
    });
  }

  getPluginConfig() {
    return this._pluginConfig;
  }

  extract(fileNameList?: string[]) {
    const results = this._extractor.extract(
      fileNameList || this._languageServiceHost.getScriptFileNames(),
      this._pluginConfig.tag,
    );
    const errors = this._extractor.pickupErrors(results);
    return [errors, results] as const;
  }

  extractToManifest() {
    const [errors, results] = this.extract();
    const manifest = this._extractor.toManifest(results, this._pluginConfig.tag);
    return [errors, manifest] as const;
  }

  async validate() {
    const [schemaErrors, schema] = await this._getSchema();
    if (!schema) return { errors: schemaErrors };
    const [extractedErrors, results] = this.extract();
    if (extractedErrors.length) {
      this._debug(`Found ${extractedErrors.length} extraction errors.`);
    }
    return {
      errors: [...schemaErrors, ...extractedErrors, ...validate(results, schema)],
      extractedResults: results,
      schema,
    };
  }

  report(outputFileName: string, manifest?: ManifestOutput, ignoreFragments = true) {
    const reporter = new MarkdownReporter();
    const reportOptions = {
      baseDir: this._prjRootPath,
      ignoreFragments,
      outputDir: path.dirname(outputFileName),
    };
    if (manifest) {
      return [[] as TsGqlError[], reporter.toMarkdownConntent(manifest, reportOptions)] as const;
    } else {
      const [errors, extractedManifest] = this.extractToManifest();
      return [errors, reporter.toMarkdownConntent(extractedManifest, reportOptions)] as const;
    }
  }

  async typegen() {
    const [schemaErrors, schema] = await this._getSchema();
    if (!schema) return { errors: schemaErrors };
    const { errors, outputSourceFiles } = this._typeGenerator.generateTypes({
      schema,
      files: this._languageServiceHost.getScriptFileNames(),
    });
    return { errors: [...schemaErrors, ...errors], outputSourceFiles };
  }

  private async _getSchema() {
    const errors: TsGqlError[] = [];
    const { schema, errors: schemaBuildErrors } = await this._schemaManager.waitSchema();
    if (schemaBuildErrors) {
      schemaBuildErrors.forEach(info => errors.push(convertSchemaBuildErrorsToErrorWithLocation(info)));
    }
    if (!schema && !errors.length) {
      errors.push(new TsGqlConfigError());
    }
    return [errors, schema] as const;
  }
}
