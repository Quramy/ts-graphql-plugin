import ts from 'typescript';
import { parse, print, DocumentNode, GraphQLError } from 'graphql';
import { visit } from 'graphql/language';
import { isTagged, ScriptSourceHelper, ResolvedTemplateInfo } from '../ts-ast-util';
import { ManifestOutput, ManifestDocumentEntry, OperationType } from './types';
import { ErrorWithLocation } from '../errors';

export type ExtractorOptions = {
  scriptSourceHelper: ScriptSourceHelper;
  debug: (msg: string) => void;
};

export type ExtractTemplateResolveErrorResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  resolveTemplateErrorMessage?: string;
  documentNode: undefined;
  resolevedTemplateInfo: undefined;
  graphqlError: undefined;
};

export type ExtractGraphQLErrorResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  resolevedTemplateInfo: ResolvedTemplateInfo;
  graphqlError: GraphQLError;
  resolveTemplateErrorMessage: undefined;
  documentNode: undefined;
};

export type ExtractSucceededResult = {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  documentNode: DocumentNode;
  resolevedTemplateInfo: ResolvedTemplateInfo;
  graphqlError: undefined;
  resolveTemplateErrorMessage: undefined;
};

export type ExtractResult = ExtractTemplateResolveErrorResult | ExtractGraphQLErrorResult | ExtractSucceededResult;

export class Extractor {
  private readonly _helper: ScriptSourceHelper;
  private readonly _debug: (msg: string) => void;

  constructor({ debug, scriptSourceHelper }: ExtractorOptions) {
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
        const resolevedTemplateInfo = this._helper.resolveTemplateLiteral(fileName, node);
        if (!resolevedTemplateInfo) {
          results.push({
            fileName,
            templateNode: node,
            resolveTemplateErrorMessage:
              "Failed to extract GraphQL document from template literal because it's interpolation is too complex.",
            resolevedTemplateInfo: undefined,
            graphqlError: undefined,
            documentNode: undefined,
          });
        } else {
          results.push({
            fileName,
            templateNode: node,
            resolevedTemplateInfo,
          } as any);
        }
      });
    });
    return results.map(result => {
      if (!result.resolevedTemplateInfo) return result;
      try {
        const documentNode = parse(result.resolevedTemplateInfo.combinedText);
        return {
          ...result,
          documentNode,
        };
      } catch (error) {
        return {
          ...result,
          graphqlError: error,
        };
      }
    });
  }

  pickupErrors(
    extractResults: ExtractResult[],
    { ignoreGraphQLError }: { ignoreGraphQLError: boolean } = { ignoreGraphQLError: false },
  ) {
    const errors: ErrorWithLocation[] = [];
    extractResults.forEach(r => {
      if (r.resolveTemplateErrorMessage) {
        errors.push(
          new ErrorWithLocation(r.resolveTemplateErrorMessage, {
            fileName: r.fileName,
            content: r.templateNode.getSourceFile().getFullText(),
            start: r.templateNode.getStart(),
            end: r.templateNode.getEnd(),
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

  getDominantDefiniton(result: ExtractSucceededResult) {
    let type: OperationType | undefined;
    let fragmentName: string | undefined;
    let operationName: string | undefined;
    visit(result.documentNode, {
      FragmentDefinition(node) {
        if (!type) {
          type = 'fragment';
        }
        fragmentName = node.name.value;
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
    return { type, operationName, fragmentName };
  }

  toManifest(extractResults: ExtractResult[], tagName: string = ''): ManifestOutput {
    const documents = extractResults
      .filter(r => !!r.documentNode)
      .map(result => {
        const r = result as ExtractSucceededResult;
        const { type, operationName } = this.getDominantDefiniton(r);
        return {
          fileName: r.fileName,
          type: type || 'other',
          operationName,
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
