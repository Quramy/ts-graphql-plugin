import * as ts from 'typescript/lib/tsserverlibrary';

import { buildClientSchema } from 'graphql';
import { CompletionItem, getAutocompleteSuggestions } from 'graphql-language-service-interface';

export interface GraphQLLanguageServiceAdapterCreateOptions {
  schema?: any;
  logger?: (msg: string) => void;
}

export class GraphQLLanguageServiceAdapter {

  private _schema: any;
  private _logger: (msg: string) => void = () => { };

  constructor(
    private _getNode: (fileName: string, position) => ts.Node = () => null,
    opt: GraphQLLanguageServiceAdapterCreateOptions = { },
  ) {
      if (opt.logger) this._logger = opt.logger;
      if (opt.schema) this.updateSchema(opt.schema);
  }

  updateSchema(schema: { data: any }) {
    this._schema = buildClientSchema(schema.data);
  }

  getCompletionInfo(delegate: (fileName: string, position: number) => ts.CompletionInfo, fileName: string, position: number, ) {
    if (!this._schema) return delegate(fileName, position);
    const node = this._getNode(fileName, position);
    if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      return delegate(fileName, position);
    }
    const cursor = position - node.getStart();
    const text = node.getText();
    const gqlCompletionItems = getAutocompleteSuggestions(this._schema, text, cursor);
    this._logger(JSON.stringify(gqlCompletionItems));
    return translateCompletionItems(gqlCompletionItems);
  }

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
