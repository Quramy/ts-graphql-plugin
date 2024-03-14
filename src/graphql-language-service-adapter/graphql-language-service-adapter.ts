import ts from 'typescript';
import { GraphQLSchema, parse, type DocumentNode } from 'graphql';
import { isTagged, ScriptSourceHelper, TagCondition, isTemplateLiteralTypeNode } from '../ts-ast-util';
import { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { getFragmentNamesInDocument, detectDuplicatedFragments, type FragmentRegistry } from '../gql-ast-util';
import { AnalysisContext, GetCompletionAtPosition, GetSemanticDiagnostics, GetQuickInfoAtPosition } from './types';
import { getCompletionAtPosition } from './get-completion-at-position';
import { getSemanticDiagnostics } from './get-semantic-diagonistics';
import { getQuickInfoAtPosition } from './get-quick-info-at-position';
import { LRUCache } from '../cache';

export interface GraphQLLanguageServiceAdapterCreateOptions {
  schema?: GraphQLSchema | null;
  schemaErrors?: SchemaBuildErrorInfo[] | null;
  logger?: (msg: string) => void;
  tag?: string;
  removeDuplicatedFragments: boolean;
  fragmentRegistry: FragmentRegistry;
}

type Args<T> = T extends (...args: infer A) => any ? A : never;

export class GraphQLLanguageServiceAdapter {
  private _schemaErrors?: SchemaBuildErrorInfo[] | null;
  private _schema?: GraphQLSchema | null;
  private readonly _tagCondition?: TagCondition;
  private readonly _removeDuplicatedFragments: boolean;
  private readonly _analysisContext: AnalysisContext;
  private readonly _fragmentRegisry: FragmentRegistry;
  private readonly _parsedDocumentCache = new LRUCache<string, DocumentNode>(100);

  constructor(
    private readonly _helper: ScriptSourceHelper,
    opt: GraphQLLanguageServiceAdapterCreateOptions,
  ) {
    if (opt.logger) this._logger = opt.logger;
    if (opt.schemaErrors) this.updateSchema(opt.schemaErrors, null);
    if (opt.schema) this.updateSchema(null, opt.schema);
    if (opt.tag) this._tagCondition = opt.tag;
    this._removeDuplicatedFragments = opt.removeDuplicatedFragments;
    this._analysisContext = this._createAnalysisContext();
    this._fragmentRegisry = opt.fragmentRegistry;
  }

  getCompletionAtPosition(delegate: GetCompletionAtPosition, ...args: Args<GetCompletionAtPosition>) {
    return getCompletionAtPosition(this._analysisContext, delegate, ...args);
  }

  getSemanticDiagnostics(delegate: GetSemanticDiagnostics, ...args: Args<GetSemanticDiagnostics>) {
    return getSemanticDiagnostics(this._analysisContext, delegate, ...args);
  }

  getQuickInfoAtPosition(delegate: GetQuickInfoAtPosition, ...args: Args<GetQuickInfoAtPosition>) {
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
      findTemplateNode: (fileName, position) => this._findTemplateNode(fileName, position),
      findTemplateNodes: fileName => this._findTemplateNodes(fileName),
      resolveTemplateInfo: (fileName, node) => this._resolveTemplateInfo(fileName, node),
    };
    return ctx;
  }

  private _findTemplateNode(fileName: string, position: number) {
    const foundNode = this._helper.getNode(fileName, position);
    if (!foundNode) return;
    let node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
    if (ts.isNoSubstitutionTemplateLiteral(foundNode)) {
      node = foundNode;
    } else if (ts.isTemplateHead(foundNode) && !isTemplateLiteralTypeNode(foundNode.parent)) {
      node = foundNode.parent;
    } else if (
      (ts.isTemplateMiddle(foundNode) || ts.isTemplateTail(foundNode)) &&
      !isTemplateLiteralTypeNode(foundNode.parent.parent)
    ) {
      node = foundNode.parent.parent;
    } else {
      return;
    }
    if (this._tagCondition && !isTagged(node, this._tagCondition)) {
      return;
    }
    return node;
  }

  private _findTemplateNodes(fileName: string) {
    const allTemplateStringNodes = this._helper.getAllNodes(
      fileName,
      (n: ts.Node) => ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n),
    );
    const nodes = allTemplateStringNodes.filter(n => {
      if (!this._tagCondition) return true;
      return isTagged(n, this._tagCondition);
    }) as (ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression)[];
    return nodes;
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
