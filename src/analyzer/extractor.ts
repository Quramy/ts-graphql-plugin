import ts from 'typescript';
import { parse, print, DocumentNode, GraphQLError } from 'graphql';
import { visit } from 'graphql/language';
import { isTagged, ScriptSourceHelper, ResolvedTemplateInfo } from '../ts-ast-util';
import { ManifestOutput, ManifestDocumentEntry, OperationType } from './types';
import { ErrorWithLocation } from '../errors';

export type ExtractorOptions = {
  scriptSourceHelper: ScriptSourceHelper;
};

export interface ExtractResult {
  fileName: string;
  templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  resolevedTemplateInfo?: ResolvedTemplateInfo;
  resolveTemplateErrorMessage?: string;
  documentNode?: DocumentNode;
  graphqlError?: GraphQLError;
}

export class Extractor {
  private readonly _helper: ScriptSourceHelper;

  constructor({ scriptSourceHelper }: ExtractorOptions) {
    this._helper = scriptSourceHelper;
  }

  extract(files: string[], tagName?: string): ExtractResult[] {
    const results: ExtractResult[] = [];
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
          });
        } else {
          results.push({
            fileName,
            templateNode: node,
            resolevedTemplateInfo,
          });
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

  toManifest(extractResults: ExtractResult[], tagName: string = ''): ManifestOutput {
    const documents = extractResults
      .filter(r => !!r.documentNode)
      .map(r => {
        const dnode = r.documentNode!;
        let type: OperationType | undefined;
        visit(dnode, {
          FragmentDefinition() {
            if (!type) {
              type = 'fragment';
            }
          },
          OperationDefinition(node) {
            if (!type || type === 'fragment') {
              type = node.operation;
            } else {
              type = 'complex';
            }
          },
        });
        return {
          fileName: r.fileName,
          type: type || 'other',
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
