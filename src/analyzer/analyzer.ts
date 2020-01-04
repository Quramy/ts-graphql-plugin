import ts from 'typescript';
import path from 'path';
import { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';
import { TsGraphQLPluginConfigOptions } from '../types';
import { SchemaManager, SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { ErrorWithLocation } from '../errors';
import { location2pos } from '../string-util';
import { validate } from './validator';
import { ManifestOutput } from './types';
import { MarkdownReporter } from './markdown-reporter';

export function convertSchemaBuildErrorsToErrorWithLocation(errorInfo: SchemaBuildErrorInfo) {
  if (errorInfo.locations && errorInfo.locations[0]) {
    const start = location2pos(errorInfo.fileContent, errorInfo.locations[0]);
    return new ErrorWithLocation(errorInfo.message, {
      fileName: errorInfo.fileName,
      content: errorInfo.fileContent,
      start,
      end: start + 1,
    });
  } else {
    return new ErrorWithLocation(errorInfo.message, {
      fileName: errorInfo.fileName,
      content: errorInfo.fileContent,
      start: 0,
      end: errorInfo.fileContent.length - 1,
    });
  }
}

export class Analyzer {
  private _extractor: Extractor;
  private _scriptSourceHelper: ScriptSourceHelper;

  constructor(
    private readonly _pluginConfig: TsGraphQLPluginConfigOptions,
    private readonly _prjRootPath: string,
    private readonly _languageServiceHost: ts.LanguageServiceHost,
    private readonly _schemaManager: SchemaManager,
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

  async validate() {
    const { schema, errors: schemaBuildErrors } = await this._schemaManager.waitSchema();
    if (schemaBuildErrors) {
      return schemaBuildErrors.map(info => convertSchemaBuildErrorsToErrorWithLocation(info));
    }
    if (!schema) {
      throw new Error(
        'No GraphQL schema. Confirm your ts-graphql-plugin\'s "schema" configuration at tsconfig.json\'s compilerOptions.plugins section.',
      );
    }
    const results = this._extractor.extract(this._languageServiceHost.getScriptFileNames(), this._pluginConfig.tag);
    const errors = this._extractor.pickupErrors(results, { ignoreGraphQLError: true });
    return [...errors, ...validate(results, schema)];
  }

  report(outputFileName: string, manifest?: ManifestOutput, ignoreFragments = true) {
    const reporter = new MarkdownReporter();
    const reportOptions = {
      baseDir: this._prjRootPath,
      ignoreFragments,
      outputDir: path.dirname(outputFileName),
    };
    if (manifest) {
      return [[] as ErrorWithLocation[], reporter.toMarkdownConntent(manifest, reportOptions)] as const;
    } else {
      const [errors, extractedManifest] = this.extract();
      return [errors, reporter.toMarkdownConntent(extractedManifest, reportOptions)] as const;
    }
  }
}
