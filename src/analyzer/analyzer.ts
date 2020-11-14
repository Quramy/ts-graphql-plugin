import ts from 'typescript';
import path from 'path';
import { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';
import { TsGraphQLPluginConfigOptions } from '../types';
import { SchemaManager, SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { TsGqlError, ErrorWithLocation, ErrorWithoutLocation } from '../errors';
import { location2pos, dasherize } from '../string-util';
import { validate } from './validator';
import { ManifestOutput } from './types';
import { MarkdownReporter } from './markdown-reporter';
import { TypeGenVisitor, TypeGenError } from '../typegen/type-gen-visitor';

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

  constructor(
    private readonly _pluginConfig: TsGraphQLPluginConfigOptions,
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
    const [extractedErrors, extractedResults] = this.extract();
    if (extractedErrors.length) {
      this._debug(`Found ${extractedErrors.length} extraction errors.`);
    }
    const typegenErrors: TsGqlError[] = [];
    const visitor = new TypeGenVisitor({ schema });
    const outputSourceFiles: { fileName: string; content: string }[] = [];
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
    extractedResults.forEach(extractedResult => {
      if (extractedResult.documentNode) {
        const { type, fragmentName, operationName } = this._extractor.getDominantDefiniton(extractedResult);
        if (type === 'complex') {
          const fileName = extractedResult.fileName;
          const content = extractedResult.templateNode.getSourceFile().getFullText();
          const start = extractedResult.templateNode.getStart();
          const end = extractedResult.templateNode.getEnd();
          const errorContent = { fileName, content, start, end };
          const error = new ErrorWithLocation('This document node has complex operations.', errorContent);
          typegenErrors.push(error);
          return;
        }
        const operationOrFragmentName = type === 'fragment' ? fragmentName : operationName;
        if (!operationOrFragmentName) return;
        const outputFileName = path.resolve(
          path.dirname(extractedResult.fileName),
          '__generated__',
          dasherize(operationOrFragmentName) + '.ts',
        );
        try {
          const outputSourceFile = visitor.visit(extractedResult.documentNode, { outputFileName });
          const content = printer.printFile(outputSourceFile);
          outputSourceFiles.push({ fileName: outputFileName, content });
          this._debug(
            `Create type source file '${path.relative(this._prjRootPath, outputFileName)}' from '${path.relative(
              this._prjRootPath,
              extractedResult.fileName,
            )}'.`,
          );
        } catch (error) {
          if (error instanceof TypeGenError) {
            const sourcePosition = extractedResult.resolevedTemplateInfo.getSourcePosition(error.node.loc!.start);
            if (sourcePosition.isInOtherExpression) return;
            const fileName = extractedResult.fileName;
            const content = extractedResult.templateNode.getSourceFile().getFullText();
            const start = sourcePosition.pos;
            const end = extractedResult.resolevedTemplateInfo.getSourcePosition(error.node.loc!.end).pos;
            const errorContent = { fileName, content, start, end };
            const translatedError = new ErrorWithLocation(error.message, errorContent);
            typegenErrors.push(translatedError);
          } else {
            throw error;
          }
        }
      }
    });
    return { errors: [...schemaErrors, ...extractedErrors, ...typegenErrors], outputSourceFiles };
  }

  private async _getSchema() {
    const errors: TsGqlError[] = [];
    const { schema, errors: schemaBuildErrors } = await this._schemaManager.waitSchema();
    if (schemaBuildErrors) {
      schemaBuildErrors.forEach(info => errors.push(convertSchemaBuildErrorsToErrorWithLocation(info)));
    }
    if (!schema && !errors.length) {
      const error = new ErrorWithoutLocation(
        'No GraphQL schema. Confirm your ts-graphql-plugin\'s "schema" configuration at tsconfig.json\'s compilerOptions.plugins section.',
      );
      errors.push(error);
    }
    return [errors, schema] as const;
  }
}
