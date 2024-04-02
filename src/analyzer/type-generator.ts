import path from 'node:path';
import type { GraphQLSchema } from 'graphql';

import ts from '../tsmodule';

import { TsGqlError, ErrorWithLocation } from '../errors';
import {
  mergeAddons,
  TypeGenVisitor,
  TypeGenError,
  type TypeGenAddonFactory,
  type TypeGenVisitorAddonContext,
} from '../typegen';
import { dasherize } from '../string-util';
import { createOutputSource, type OutputSource, type StrictTagCondition } from '../ts-ast-util';
import type { Extractor, ExtractSucceededResult } from './extractor';

export type TypeGeneratorOptions = {
  prjRootPath: string;
  extractor: Extractor;
  debug: (msg: string) => void;
  tag: StrictTagCondition;
  addonFactories: TypeGenAddonFactory[];
};

export class TypeGenerator {
  private readonly _prjRootPath: string;
  private readonly _extractor: Extractor;
  private readonly _tag: StrictTagCondition;
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
    fileEntry,
    outputSource,
  }: {
    schema: GraphQLSchema;
    fileEntry: ExtractSucceededResult;
    outputSource: OutputSource;
  }) {
    const context: TypeGenVisitorAddonContext = {
      schema,
      source: outputSource,
      extractedInfo: {
        fileName: fileEntry.fileName,
        tsTemplateNode: fileEntry.templateNode,
        tsSourceFile: fileEntry.templateNode.getSourceFile(),
      },
    };
    const addons = this._addonFactories.map(factory => factory(context));
    return { addon: mergeAddons(addons), context };
  }

  generateTypes({ files, schema }: { files: string[]; schema: GraphQLSchema }) {
    const extractedResult = this._extractor.extract(files, this._tag);
    const extractedErrors = this._extractor.pickupErrors(extractedResult);
    if (extractedErrors.length) {
      this._debug(`Found ${extractedErrors.length} extraction errors.`);
    }
    const typegenErrors: TsGqlError[] = [];
    const visitor = new TypeGenVisitor({ schema });
    const outputSourceFiles: { fileName: string; content: string }[] = [];
    extractedResult.fileEntries.forEach(fileEntry => {
      if (fileEntry.documentNode) {
        const { inflatedDocumentNode, isDefinedExternal } = this._extractor.inflateDocument(fileEntry, extractedResult);
        const { type, fragmentName, operationName } = this._extractor.getDominantDefinition(fileEntry);
        if (type === 'complex') {
          const fileName = fileEntry.fileName;
          const content = fileEntry.templateNode.getSourceFile().getFullText();
          const start = fileEntry.templateNode.getStart();
          const end = fileEntry.templateNode.getEnd();
          const errorContent = { fileName, content, start, end };
          const error = new ErrorWithLocation('This document node has complex operations.', errorContent);
          typegenErrors.push(error);
          return;
        }
        const operationOrFragmentName = type === 'fragment' ? fragmentName : operationName;
        if (!operationOrFragmentName) return;
        const outputFileName = path.resolve(
          path.dirname(fileEntry.fileName),
          '__generated__',
          dasherize(operationOrFragmentName) + '.ts',
        );
        try {
          const outputSource = createOutputSource({ outputFileName });
          const { addon } = this.createAddon({ schema, outputSource, fileEntry });
          const outputSourceFile = visitor.visit(inflatedDocumentNode, { outputSource, addon });
          const content = this._printer.printFile(outputSourceFile);
          outputSourceFiles.push({ fileName: outputFileName, content });
          this._debug(
            `Create type source file '${path.relative(this._prjRootPath, outputFileName)}' from '${path.relative(
              this._prjRootPath,
              fileEntry.fileName,
            )}'.`,
          );
        } catch (error) {
          if (error instanceof TypeGenError) {
            if (isDefinedExternal(error.node)) return;
            const sourcePosition = fileEntry.resolevedTemplateInfo.getSourcePosition(error.node.loc!.start);
            if (sourcePosition.isInOtherExpression) return;
            const fileName = fileEntry.fileName;
            const content = fileEntry.templateNode.getSourceFile().getFullText();
            const start = sourcePosition.pos;
            const end = fileEntry.resolevedTemplateInfo.getSourcePosition(error.node.loc!.end).pos;
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
