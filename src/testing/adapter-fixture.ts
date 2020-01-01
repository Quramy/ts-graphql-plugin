import ts from 'typescript';
import { findAllNodes, findNode, createResultForNoSubstitution, ResolvedTemplateInfo } from '../ts-util';
import { buildClientSchema } from 'graphql';
import { GraphQLLanguageServiceAdapter, ScriptSourceHelper } from '../graphql-language-service-adapter';
export class AdapterFixture {
  adapter: GraphQLLanguageServiceAdapter;
  private _source: ts.SourceFile;

  constructor(scriptFileName: string, introspectionResultJson?: { data: any }) {
    this._source = ts.createSourceFile(scriptFileName, '', ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
    const getNode = (fileName: string, position: number) => findNode(this._source, position);
    const getAllNodes = (foundNode: string, cond: (n: ts.Node) => boolean) => {
      return findAllNodes(this._source, cond);
    };
    const getLineAndChar = (fileName: string, position: number) => {
      return ts.getLineAndCharacterOfPosition(this._source, position);
    };
    const resolveTemplateLiteral = (
      fileName: string,
      node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression,
    ) => {
      if (ts.isTemplateExpression(node)) {
        throw new Error('not implemented');
      } else {
        return createResultForNoSubstitution(node, scriptFileName);
      }
    };
    const helper: ScriptSourceHelper = {
      getNode,
      getAllNodes,
      getLineAndChar,
      resolveTemplateLiteral,
    };
    this.adapter = new GraphQLLanguageServiceAdapter(helper, {
      schema: introspectionResultJson && buildClientSchema(introspectionResultJson.data),
    });
  }

  get source() {
    return this._source && this._source.getText();
  }

  set source(newText: string) {
    const range: ts.TextChangeRange = {
      span: {
        start: 0,
        length: this._source.getText().length,
      },
      newLength: newText.length,
    };
    this._source = this._source.update(newText, range);
  }
}
