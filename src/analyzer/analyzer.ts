import path from 'node:path';

import ts from '../tsmodule';

import type { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import {
  createScriptSourceHelper,
  getTemplateNodeUnder,
  findAllNodes,
  registerDocumentChangeEvent,
  getSanitizedTemplateText,
  parseTagConfig,
} from '../ts-ast-util';
import { FragmentRegistry } from '../gql-ast-util';
import { SchemaManager, SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { TsGqlError, ErrorWithLocation, ErrorWithoutLocation } from '../errors';
import { location2pos } from '../string-util';
import { validate } from './validator';
import type { ManifestOutput, TsGraphQLPluginConfig } from './types';
import { MarkdownReporter } from './markdown-reporter';
import { TypeGenerator } from './type-generator';
import { createFileNameFilter } from '../ts-ast-util/file-name-filter';

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
    const documentRegistry = ts.createDocumentRegistry();
    const langService = ts.createLanguageService(this._languageServiceHost, documentRegistry);
    const fragmentRegistry = new FragmentRegistry();
    const projectName = path.join(this._prjRootPath, 'tsconfig.json');
    const isExcluded = createFileNameFilter({ specs: this._pluginConfig.exclude, projectName });
    this._scriptSourceHelper = createScriptSourceHelper(
      {
        languageService: langService,
        languageServiceHost: this._languageServiceHost,
        project: {
          getProjectName: () => projectName,
        },
      },
      { exclude: this._pluginConfig.exclude, reuseProgram: true },
    );
    this._extractor = new Extractor({
      removeDuplicatedFragments: this._pluginConfig.removeDuplicatedFragments === false ? false : true,
      scriptSourceHelper: this._scriptSourceHelper,
      fragmentRegistry,
      debug: this._debug,
    });
    this._typeGenerator = new TypeGenerator({
      prjRootPath: this._prjRootPath,
      extractor: this._extractor,
      tag: parseTagConfig(this._pluginConfig.tag),
      addonFactories: this._pluginConfig.typegen.addonFactories,
      debug: this._debug,
    });
    if (this._pluginConfig.enabledGlobalFragments !== false) {
      const tag = parseTagConfig(this._pluginConfig.tag);
      registerDocumentChangeEvent(documentRegistry, {
        onAcquire: (fileName, sourceFile, version) => {
          if (!isExcluded(fileName) && this._languageServiceHost.getScriptFileNames().includes(fileName)) {
            fragmentRegistry.registerDocuments(
              fileName,
              version,
              findAllNodes(sourceFile, node => getTemplateNodeUnder(node, tag)).map(node =>
                getSanitizedTemplateText(node, sourceFile),
              ),
            );
          }
        },
      });
    }
  }

  getPluginConfig() {
    return this._pluginConfig;
  }

  extract(fileNameList?: string[]) {
    const results = this._extractor.extract(
      fileNameList || this._languageServiceHost.getScriptFileNames(),
      parseTagConfig(this._pluginConfig.tag),
    );
    const errors = this._extractor.pickupErrors(results);
    return [errors, results] as const;
  }

  extractToManifest() {
    const [errors, results] = this.extract();
    const manifest = this._extractor.toManifest(results, parseTagConfig(this._pluginConfig.tag));
    return [errors, manifest] as const;
  }

  async validate() {
    const [schemaErrors, schema] = await this._getSchema();
    if (!schema) return { errors: schemaErrors };
    const [extractedErrors, result] = this.extract();
    if (extractedErrors.length) {
      this._debug(`Found ${extractedErrors.length} extraction errors.`);
    }
    return {
      errors: [...schemaErrors, ...extractedErrors, ...validate(result, schema)],
      extractedResults: result,
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
