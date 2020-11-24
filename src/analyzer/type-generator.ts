import path from 'path';
import ts from 'typescript';
import { GraphQLSchema } from 'graphql/type';

import { TsGqlError, ErrorWithLocation } from '../errors';
import { mergeAddons, TypeGenVisitor, TypeGenError, TypeGenAddonFactory, TypeGenVisitorAddonContext } from '../typegen';
import { dasherize } from '../string-util';
import { OutputSource, createOutputSource } from '../ts-ast-util';
import { Extractor, ExtractSucceededResult } from './extractor';

export type TypeGeneratorOptions = {
  prjRootPath: string;
  extractor: Extractor;
  debug: (msg: string) => void;
  tag: string | undefined;
  addonFactories: TypeGenAddonFactory[];
};

export class TypeGenerator {
  private readonly _prjRootPath: string;
  private readonly _extractor: Extractor;
  private readonly _tag: string | undefined;
  private readonly _addonFactories: TypeGenAddonFactory[];
  private readonly _debug: (msg: string) => void;
  private readonly _printer: ts.Printer;

  constructor({ prjRootPath, extractor, tag, addonFactories, debug }: TypeGeneratorOptions) {
    this._prjRootPath = prjRootPath;
    this._extractor = extractor;
    this._tag = tag;
    this._addonFactories = addonFactories;
    this._debug = debug;
    this._printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
  }

  createAddon({
    schema,
    extractedResult,
    outputSource,
  }: {
    schema: GraphQLSchema;
    extractedResult: ExtractSucceededResult;
    outputSource: OutputSource;
  }) {
    const context: TypeGenVisitorAddonContext = {
      schema,
      source: outputSource,
      extractedInfo: {
        fileName: extractedResult.fileName,
        tsTemplateNode: extractedResult.templateNode,
        tsSourceFile: extractedResult.templateNode.getSourceFile(),
      },
    };
    const addons = this._addonFactories.map(factory => factory(context));
    return { addon: mergeAddons(addons), context };
  }

  generateTypes({ files, schema }: { files: string[]; schema: GraphQLSchema }) {
    const extractedResults = this._extractor.extract(files, this._tag);
    const extractedErrors = this._extractor.pickupErrors(extractedResults);
    if (extractedErrors.length) {
      this._debug(`Found ${extractedErrors.length} extraction errors.`);
    }
    const typegenErrors: TsGqlError[] = [];
    const visitor = new TypeGenVisitor({ schema });
    const outputSourceFiles: { fileName: string; content: string }[] = [];
    extractedResults.forEach(extractedResult => {
      if (extractedResult.documentNode) {
        const { type, fragmentName, operationName } = this._extractor.getDominantDefinition(extractedResult);
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
          const outputSource = createOutputSource({ outputFileName });
          const { addon } = this.createAddon({ schema, outputSource, extractedResult });
          const outputSourceFile = visitor.visit(extractedResult.documentNode, { outputSource, addon });
          const content = this._printer.printFile(outputSourceFile);
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
    return { errors: [...extractedErrors, ...typegenErrors], outputSourceFiles };
  }
}
