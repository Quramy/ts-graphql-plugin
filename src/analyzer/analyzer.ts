import ts from 'typescript';
import path from 'path';
import { ScriptSourceHelper } from '../ts-ast-util/types';
import { Extractor } from './extractor';
import { createScriptSourceHelper } from '../ts-ast-util/script-source-helper';
import { TsGraphQLPluginConfigOptions } from '../types';
import { SchemaManager, SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { ErrorWithLocation } from '../errors';
import { location2pos, dasherize } from '../string-util';
import { validate } from './validator';
import { ManifestOutput } from './types';
import { MarkdownReporter } from './markdown-reporter';
import { TypeGenVisitor, TypeGenError } from '../typegen/type-gen-visitor';

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
    const { schema, errors: schemaBuildErrors } = await this._schemaManager.waitSchema();
    if (schemaBuildErrors) {
      return { errors: schemaBuildErrors.map(info => convertSchemaBuildErrorsToErrorWithLocation(info)) };
    }
    if (!schema) {
      throw new Error(
        'No GraphQL schema. Confirm your ts-graphql-plugin\'s "schema" configuration at tsconfig.json\'s compilerOptions.plugins section.',
      );
    }
    const [errors, results] = this.extract();
    if (errors.length) {
      this._debug(`Found ${errors.length} extraction errors.`);
    }
    return { errors: [...errors, ...validate(results, schema)], extractedResults: results, schema };
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
      const [errors, extractedManifest] = this.extractToManifest();
      return [errors, reporter.toMarkdownConntent(extractedManifest, reportOptions)] as const;
    }
  }

  async typegen() {
    const { errors, schema, extractedResults } = await this.validate();
    if (!schema || !extractedResults) return { errors };
    const visitor = new TypeGenVisitor({ schema });
    const outputSourceFiles: ts.SourceFile[] = [];
    extractedResults.forEach(r => {
      if (r.documentNode) {
        const { type, fragmentName, operationName } = this._extractor.getDominantDefiniton(r);
        if (type === 'complex') {
          errors.push(
            new ErrorWithLocation('This document node has complex operations.', {
              fileName: r.fileName,
              content: r.templateNode.getText(),
              start: r.templateNode.getStart(),
              end: r.templateNode.getEnd(),
            }),
          );
          return;
        }
        const operationOrFragmentName = type === 'fragment' ? fragmentName : operationName;
        if (!operationOrFragmentName) return;
        const outputFileName = path.resolve(
          path.dirname(r.fileName),
          '__generated__',
          dasherize(operationOrFragmentName) + '.ts',
        );
        try {
          outputSourceFiles.push(visitor.visit(r.documentNode, { outputFileName }));
          this._debug(
            `Create type source file '${path.relative(this._prjRootPath, outputFileName)}' from '${path.relative(
              this._prjRootPath,
              r.fileName,
            )}'.`,
          );
        } catch (error) {
          if (error instanceof TypeGenError) {
            const sourcePosition = r.resolevedTemplateInfo.getSourcePosition(error.node.loc!.start);
            if (sourcePosition.isInOtherExpression) return;
            const translatedError = new ErrorWithLocation(error.message, {
              fileName: r.fileName,
              content: r.templateNode.getSourceFile().getFullText(),
              start: sourcePosition.pos,
              end: r.resolevedTemplateInfo.getSourcePosition(error.node.loc!.end).pos,
            });
            errors.push(translatedError);
          } else {
            throw error;
          }
        }
      }
    });
    return { errors, outputSourceFiles };
  }
}
