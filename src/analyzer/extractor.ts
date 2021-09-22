import ts from 'typescript';
import { parse, print, DocumentNode, GraphQLError } from 'graphql';
import { visit } from 'graphql/language';
import { isTagged, ScriptSourceHelper, ResolvedTemplateInfo } from '../ts-ast-util';
import { ManifestOutput, ManifestDocumentEntry, OperationType } from './types';
import { ErrorWithLocation, ERROR_CODES } from '../errors';
import { detectDuplicatedFragments } from '../gql-ast-util';

export type ExtractorOptions = {
  removeDuplicatedFragments: boolean;
  scriptSourceHelper: ScriptSourceHelper;
  debug: (msg: string) => void;
};

export type ExtractTemplateResolveErrorResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  resolveTemplateError: {
    message: string;
    start: number;
    end: number;
  };
  documentNode: undefined;
  resolevedTemplateInfo: undefined;
  graphqlError: undefined;
};

export type ExtractGraphQLErrorResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  resolevedTemplateInfo: ResolvedTemplateInfo;
  resolveTemplateError: undefined;
  graphqlError: GraphQLError;
  resolveTemplateErrorMessage: undefined;
  documentNode: undefined;
};

export type ExtractSucceededResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  documentNode: DocumentNode;
  resolevedTemplateInfo: ResolvedTemplateInfo;
  resolveTemplateError: undefined;
  graphqlError: undefined;
  resolveTemplateErrorMessage: undefined;
};

export type ExtractResult = ExtractTemplateResolveErrorResult | ExtractGraphQLErrorResult | ExtractSucceededResult;

export class Extractor {
  private readonly _removeDuplicatedFragments: boolean;
  private readonly _helper: ScriptSourceHelper;
  private readonly _debug: (msg: string) => void;

  constructor({ debug, removeDuplicatedFragments, scriptSourceHelper }: ExtractorOptions) {
    this._removeDuplicatedFragments = removeDuplicatedFragments;
    this._helper = scriptSourceHelper;
    this._debug = debug;
  }

  extract(files: string[], tagName?: string): ExtractResult[] {
    const results: ExtractResult[] = [];
    this._debug('Extract template literals from: ');
    this._debug(files.map(f => ' ' + f).join(',\n'));
    files.forEach(fileName => {
      const nodes = this._helper
        .getAllNodes(fileName, node => ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
        .filter(node => (tagName ? isTagged(node, tagName) : true)) as (
        | ts.TemplateExpression
        | ts.NoSubstitutionTemplateLiteral
      )[];
      nodes.forEach(node => {
        const { resolvedInfo, resolveErrors } = this._helper.resolveTemplateLiteral(fileName, node);
        if (!resolvedInfo) {
          resolveErrors
            .filter(re => re.fileName === fileName)
            .forEach(resolveError => {
              results.push({
                fileName,
                templateNode: node,
                resolveTemplateError: {
                  message: ERROR_CODES.templateIsTooComplex.message,
                  start: resolveError.start,
                  end: resolveError.end,
                },
                resolevedTemplateInfo: undefined,
                graphqlError: undefined,
                documentNode: undefined,
              });
            });
        } else {
          results.push({
            fileName,
            templateNode: node,
            resolevedTemplateInfo: resolvedInfo,
          } as any);
        }
      });
    });
    return results.map(result => {
      if (!result.resolevedTemplateInfo) return result;
      try {
        const rawDocumentNode = parse(result.resolevedTemplateInfo.combinedText);
        if (!this._removeDuplicatedFragments) {
          return {
            ...result,
            documentNode: rawDocumentNode,
          } as ExtractSucceededResult;
        }
        const duplicatedInfo = detectDuplicatedFragments(rawDocumentNode);
        const updatedResolvedInfo = duplicatedInfo.reduce(
          (acc, fragmentInfo) => this._helper.updateTemplateLiteralInfo(acc, fragmentInfo),
          result.resolevedTemplateInfo,
        );
        const documentNode = parse(updatedResolvedInfo.combinedText);
        return {
          ...result,
          documentNode,
          resolevedTemplateInfo: updatedResolvedInfo,
        } as ExtractSucceededResult;
      } catch (error) {
        if (error instanceof GraphQLError) {
          return {
            ...result,
            graphqlError: error,
          } as ExtractGraphQLErrorResult;
        } else {
          throw error;
        }
      }
    });
  }

  pickupErrors(
    extractResults: ExtractResult[],
    { ignoreGraphQLError }: { ignoreGraphQLError: boolean } = { ignoreGraphQLError: false },
  ) {
    const errors: ErrorWithLocation[] = [];
    extractResults.forEach(r => {
      if (r.resolveTemplateError) {
        errors.push(
          new ErrorWithLocation(r.resolveTemplateError.message, {
            fileName: r.fileName,
            severity: 'Warn',
            content: r.templateNode.getSourceFile().getFullText(),
            start: r.resolveTemplateError.start,
            end: r.resolveTemplateError.end,
          }),
        );
      } else if (!ignoreGraphQLError && r.graphqlError) {
        const innerLoc = r.graphqlError.locations && r.graphqlError.locations[0];
        if (!innerLoc) {
          errors.push(
            new ErrorWithLocation(r.graphqlError.message, {
              fileName: r.fileName,
              content: r.templateNode.getSourceFile().getFullText(),
              start: r.templateNode.getStart(),
              end: r.templateNode.getEnd(),
            }),
          );
        } else if (r.resolevedTemplateInfo) {
          const info = r.resolevedTemplateInfo;
          const innerPosition = info.convertInnerLocation2InnerPosition({
            line: innerLoc.line - 1,
            character: innerLoc.column - 1,
          });
          const start = info.getSourcePosition(innerPosition).pos;
          errors.push(
            new ErrorWithLocation(r.graphqlError.message, {
              fileName: r.fileName,
              content: r.templateNode.getSourceFile().getFullText(),
              start,
              end: start + 1,
            }),
          );
        }
      }
    });
    return errors;
  }

  getDominantDefinition(result: ExtractSucceededResult) {
    let type: OperationType | undefined;
    const definedFragmentNames: string[] = [];
    const referencedFragmentNames: string[] = [];
    let operationName: string | undefined;
    visit(result.documentNode, {
      FragmentDefinition(node) {
        if (!type) {
          type = 'fragment';
        }
        definedFragmentNames.push(node.name.value);
      },
      FragmentSpread(node) {
        referencedFragmentNames.push(node.name.value);
      },
      OperationDefinition(node) {
        if (!type || type === 'fragment') {
          type = node.operation;
        } else {
          type = 'complex';
        }
        if (!operationName) {
          operationName = node.name ? node.name.value : 'ANONYMOUS_QUERY';
        } else {
          operationName = 'MULTIPLE_OPERATIONS';
        }
      },
    });
    const noReferedFragmentNames = definedFragmentNames.filter(defName =>
      referencedFragmentNames.every(n => defName !== n),
    );
    return { type, operationName, fragmentName: noReferedFragmentNames[noReferedFragmentNames.length - 1] };
  }

  toManifest(extractResults: ExtractResult[], tagName: string = ''): ManifestOutput {
    const documents = extractResults
      .filter(r => !!r.documentNode)
      .map(result => {
        const r = result as ExtractSucceededResult;
        const { type, operationName, fragmentName } = this.getDominantDefinition(r);
        return {
          fileName: r.fileName,
          type: type || 'other',
          operationName,
          fragmentName,
          body: print(r.documentNode!),
          tag: tagName,
          templateLiteralNodeStart: this._helper.getLineAndChar(r.fileName, r.templateNode.getStart()),
          templateLiteralNodeEnd: this._helper.getLineAndChar(r.fileName, r.templateNode.getEnd()),
          documentStart: this._helper.getLineAndChar(r.fileName, r.templateNode.getStart() + 1),
          documentEnd: this._helper.getLineAndChar(r.fileName, r.templateNode.getEnd() - 1),
        } as ManifestDocumentEntry;
      });
    return {
      documents,
    };
  }
}
