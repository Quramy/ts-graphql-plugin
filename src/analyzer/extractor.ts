import ts from 'typescript';
import {
  parse,
  visit,
  print,
  GraphQLError,
  Kind,
  type ASTNode,
  type DocumentNode,
  type FragmentDefinitionNode,
} from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import {
  getTemplateNodeUnder,
  getTagName,
  ScriptSourceHelper,
  ResolvedTemplateInfo,
  StrictTagCondition,
} from '../ts-ast-util';
import type { ManifestOutput, ManifestDocumentEntry, OperationType } from './types';
import { ErrorWithLocation, ERROR_CODES } from '../errors';
import {
  detectDuplicatedFragments,
  FragmentRegistry,
  getFragmentNamesInDocument,
  cloneFragmentMap,
} from '../gql-ast-util';

export type ExtractorOptions = {
  removeDuplicatedFragments: boolean;
  scriptSourceHelper: ScriptSourceHelper;
  fragmentRegistry: FragmentRegistry;
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

export type ExtractFileResult = ExtractTemplateResolveErrorResult | ExtractGraphQLErrorResult | ExtractSucceededResult;

export type ExtractResult = {
  fileEntries: ExtractFileResult[];
  globalFragments: {
    definitions: FragmentDefinitionNode[];
    definitionMap: Map<string, FragmentDefinitionNode>;
    duplicatedDefinitions: Set<string>;
  };
};

export class Extractor {
  private readonly _removeDuplicatedFragments: boolean;
  private readonly _helper: ScriptSourceHelper;
  private readonly _fragmentRegistry: FragmentRegistry;
  private readonly _debug: (msg: string) => void;

  constructor({ debug, removeDuplicatedFragments, fragmentRegistry, scriptSourceHelper }: ExtractorOptions) {
    this._removeDuplicatedFragments = removeDuplicatedFragments;
    this._fragmentRegistry = fragmentRegistry;
    this._helper = scriptSourceHelper;
    this._debug = debug;
  }

  extract(files: string[], tag: StrictTagCondition): ExtractResult {
    const results: ExtractFileResult[] = [];
    const targetFiles = files.filter(fileName => !this._helper.isExcluded(fileName));
    this._debug('Extract template literals from: ');
    this._debug(targetFiles.map(f => ' ' + f).join(',\n'));
    targetFiles.forEach(fileName => {
      if (this._helper.isExcluded(fileName)) return;
      const nodes = this._helper.getAllNodes(fileName, node => getTemplateNodeUnder(node, tag));
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
    const fileEntries = results.map(result => {
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

    const globalDefinitonsWithMap = this._fragmentRegistry.getFragmentDefinitionsWithMap();

    return {
      fileEntries,
      globalFragments: {
        definitions: globalDefinitonsWithMap.definitions,
        definitionMap: globalDefinitonsWithMap.map,
        duplicatedDefinitions: this._fragmentRegistry.getDuplicaterdFragmentDefinitions(),
      },
    };
  }

  pickupErrors(
    { fileEntries: extractResults }: ExtractResult,
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

  inflateDocument(
    fileEntry: ExtractSucceededResult,
    { globalFragments }: { globalFragments: { definitionMap: Map<string, FragmentDefinitionNode> } },
  ) {
    const externalFragments = getFragmentDependenciesForAST(
      fileEntry.documentNode,
      cloneFragmentMap(globalFragments.definitionMap, getFragmentNamesInDocument(fileEntry.documentNode)),
    );
    const inflatedDocumentNode: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [...fileEntry.documentNode.definitions, ...externalFragments],
      loc: fileEntry.documentNode.loc,
    };
    const additionalDocuments: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: externalFragments,
    };
    const isDefinedExternal = (node: ASTNode) => {
      let found = false;
      visit(additionalDocuments, {
        enter: n => {
          found = node === n;
        },
      });
      return found;
    };

    return {
      inflatedDocumentNode,
      externalFragments,
      additionalDocuments,
      isDefinedExternal,
    };
  }

  toManifest({ fileEntries: extractResults, globalFragments }: ExtractResult, tag: StrictTagCondition): ManifestOutput {
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
          body: print(this.inflateDocument(r, { globalFragments }).inflatedDocumentNode),
          tag: getTagName(r.templateNode, tag),
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
