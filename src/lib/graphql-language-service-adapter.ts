import * as ts from 'typescript/lib/tsserverlibrary';

import { buildClientSchema } from 'graphql';
import { CompletionItem, getAutocompleteSuggestions } from 'graphql-language-service-interface';
import { isTagged, TagCondition } from './ts-util/index';

export interface GraphQLLanguageServiceAdapterCreateOptions {
  schema?: any;
  logger?: (msg: string) => void;
  tag?: string;
}

export type GetCompletionAtPosition = ts.LanguageService['getCompletionsAtPosition'];

export class GraphQLLanguageServiceAdapter {

  private _schema: any;
  private _tagCondition: TagCondition = null;

  constructor(
    private _getNode: (fileName: string, position) => ts.Node = () => null,
    opt: GraphQLLanguageServiceAdapterCreateOptions = { },
  ) {
      if (opt.logger) this._logger = opt.logger;
      if (opt.schema) this.updateSchema(opt.schema);
      if (opt.tag) this._tagCondition = opt.tag;
  }

  updateSchema(schema: { data: any }) {
    try {
      this._schema = buildClientSchema(schema.data);
    } catch (err) {
      this._logger('Fail to build schema...');
      this._logger(err);
      this._schema = null;
    }
  }

  getCompletionAtPosition(delegate: GetCompletionAtPosition, fileName: string, position: number ) {
    if (!this._schema) return delegate(fileName, position);
    const node = this._getNode(fileName, position);
    if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      return delegate(fileName, position);
    }
    if (this._tagCondition && !isTagged(node, this._tagCondition)) {
      return delegate(fileName, position);
    }
    const cursor = position - node.getStart();
    const text = node.getText().slice(1, cursor + 1);  // remove the backquote char
    this._logger('Search text: "' + text + '"');
    const gqlCompletionItems = getAutocompleteSuggestions(this._schema, text, cursor);
    this._logger(JSON.stringify(gqlCompletionItems));
    return translateCompletionItems(gqlCompletionItems);
  }

  private _logger: (msg: string) => void = () => { };
}

function translateCompletionItems(items: CompletionItem[]): ts.CompletionInfo {
  const result: ts.CompletionInfo = {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: items.map(r => {
      const kind = r.kind ? r.kind + '' : 'unknown';
      return {
        name: r.label,
        kindModifiers: 'declare',
        kind,
        sortText: '0',
      };
    }),
  };
  return result;
}
