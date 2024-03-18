import ts from 'typescript';
import { parse, type GraphQLSchema, type DocumentNode } from 'graphql';
import {
  getTemplateNodeUnder,
  isTaggedTemplateNode,
  isTemplateLiteralTypeNode,
  type ScriptSourceHelper,
  type StrictTagCondition,
} from '../ts-ast-util';
import type { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { getFragmentNamesInDocument, detectDuplicatedFragments, type FragmentRegistry } from '../gql-ast-util';
import type { AnalysisContext, GetCompletionAtPosition, GetSemanticDiagnostics, GetQuickInfoAtPosition } from './types';
import { getCompletionAtPosition } from './get-completion-at-position';
import { getSemanticDiagnostics } from './get-semantic-diagnostics';
import { getQuickInfoAtPosition } from './get-quick-info-at-position';
import { LRUCache } from '../cache';

export interface GraphQLLanguageServiceAdapterCreateOptions {
  schema?: GraphQLSchema | null;
  schemaErrors?: SchemaBuildErrorInfo[] | null;
  logger?: (msg: string) => void;
  tag: StrictTagCondition;
  removeDuplicatedFragments: boolean;
  fragmentRegistry: FragmentRegistry;
}

export class GraphQLLanguageServiceAdapter {
  private _schemaErrors?: SchemaBuildErrorInfo[] | null;
  private _schema?: GraphQLSchema | null;
  private readonly _tagCondition: StrictTagCondition;
  private readonly _removeDuplicatedFragments: boolean;
  private readonly _analysisContext: AnalysisContext;
  private readonly _fragmentRegisry: FragmentRegistry;
  private readonly _parsedDocumentCache = new LRUCache<string, DocumentNode>(500);

  constructor(
    private readonly _helper: ScriptSourceHelper,
    opt: GraphQLLanguageServiceAdapterCreateOptions,
  ) {
    if (opt.logger) this._logger = opt.logger;
    if (opt.schemaErrors) this.updateSchema(opt.schemaErrors, null);
    if (opt.schema) this.updateSchema(null, opt.schema);
    this._tagCondition = opt.tag;
    this._removeDuplicatedFragments = opt.removeDuplicatedFragments;
    this._analysisContext = this._createAnalysisContext();
    this._fragmentRegisry = opt.fragmentRegistry;
  }

  getCompletionAtPosition(delegate: GetCompletionAtPosition, ...args: Parameters<GetCompletionAtPosition>) {
    return getCompletionAtPosition(this._analysisContext, delegate, ...args);
  }

  getSemanticDiagnostics(delegate: GetSemanticDiagnostics, ...args: Parameters<GetSemanticDiagnostics>) {
    return getSemanticDiagnostics(this._analysisContext, delegate, ...args);
  }

  getQuickInfoAtPosition(delegate: GetQuickInfoAtPosition, ...args: Parameters<GetQuickInfoAtPosition>) {
    return getQuickInfoAtPosition(this._analysisContext, delegate, ...args);
  }

  updateSchema(errors: SchemaBuildErrorInfo[] | null, schema: GraphQLSchema | null) {
    if (errors) {
      this._schemaErrors = errors;
      this._schema = null;
    } else {
      this._schema = schema;
      this._schemaErrors = null;
    }
  }

  private _createAnalysisContext() {
    const ctx: AnalysisContext = {
      debug: msg => this._logger(msg),
      getScriptSourceHelper: () => this._helper,
      getSchema: () => this._schema,
      getSchemaOrSchemaErrors: () => {
        if (!this._schema) {
          return [null, this._schemaErrors as SchemaBuildErrorInfo[]];
        } else {
          return [this._schema, null];
        }
      },
      getGraphQLDocumentNode: text => this._parse(text),
      getGlobalFragmentDefinitions: () => this._fragmentRegisry.getFragmentDefinitions(),
      getExternalFragmentDefinitions: (documentStr, fileName, sourcePosition) =>
        this._fragmentRegisry.getExternalFragments(documentStr, fileName, sourcePosition),
      getDuplicaterdFragmentDefinitions: () => this._fragmentRegisry.getDuplicaterdFragmentDefinitions(),
      findAscendantTemplateNode: (fileName, position) => this._findAscendantTemplateNode(fileName, position),
      findTemplateNodes: fileName => this._findTemplateNodes(fileName),
      resolveTemplateInfo: (fileName, node) => this._resolveTemplateInfo(fileName, node),
    };
    return ctx;
  }

  private _findAscendantTemplateNode(fileName: string, position: number) {
    const nodeUnderCursor = this._helper.getNode(fileName, position);
    if (!nodeUnderCursor) return;

    let templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;

    if (ts.isNoSubstitutionTemplateLiteral(nodeUnderCursor)) {
      templateNode = nodeUnderCursor;
    } else if (ts.isTemplateHead(nodeUnderCursor) && !isTemplateLiteralTypeNode(nodeUnderCursor.parent)) {
      templateNode = nodeUnderCursor.parent;
    } else if (
      (ts.isTemplateMiddle(nodeUnderCursor) || ts.isTemplateTail(nodeUnderCursor)) &&
      !isTemplateLiteralTypeNode(nodeUnderCursor.parent.parent)
    ) {
      templateNode = nodeUnderCursor.parent.parent;
    } else {
      return;
    }
    if (!isTaggedTemplateNode(templateNode, this._tagCondition)) {
      return;
    }
    return templateNode;
  }

  private _findTemplateNodes(fileName: string) {
    return this._helper.getAllNodes(fileName, node => getTemplateNodeUnder(node, this._tagCondition));
  }

  private _parse(text: string) {
    const cached = this._parsedDocumentCache.get(text);
    if (cached) return cached;
    try {
      const parsed = parse(text);
      this._parsedDocumentCache.set(text, parsed);
      return parsed;
    } catch {
      return undefined;
    }
  }

  private _resolveTemplateInfo(fileName: string, node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral) {
    const { resolvedInfo, resolveErrors } = this._helper.resolveTemplateLiteral(fileName, node);
    if (!resolvedInfo) return { resolveErrors };
    const documentNode = this._parse(resolvedInfo.combinedText);
    if (!documentNode) {
      // Note:
      // `parse` throws GraphQL syntax error when combinedText is invalid for GraphQL syntax.
      // We don't need handle this error because getDiagnostics method in this class re-checks syntax with graphql-lang-service,
      return { resolvedInfo, resolveErrors };
    }
    const fragmentNames = getFragmentNamesInDocument(documentNode);
    if (!this._removeDuplicatedFragments) return { resolveErrors, resolvedInfo, fragmentNames };
    const duplicatedFragmentInfoList = detectDuplicatedFragments(documentNode);
    const info = duplicatedFragmentInfoList.reduce((acc, fragmentInfo) => {
      return this._helper.updateTemplateLiteralInfo(acc, fragmentInfo);
    }, resolvedInfo);
    return { resolvedInfo: info, resolveErrors };
  }

  private _logger: (msg: string) => void = () => {};
}
