import ts from 'typescript';
import { findAllNodes, findNode, createResultForNoSubstitution, ScriptSourceHelper } from '../../ts-ast-util';
import { GraphQLSchema } from 'graphql';
import { GraphQLLanguageServiceAdapter } from '..';
export class AdapterFixture {
  adapter: GraphQLLanguageServiceAdapter;
  private _source: ts.SourceFile;

  constructor(scriptFileName: string, schema?: GraphQLSchema) {
    this._source = ts.createSourceFile(scriptFileName, '', ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
    // @ts-ignore
    const getNode = (fileName: string, position: number) => findNode(this._source, position);
    // @ts-ignore
    const getAllNodes = (foundNode: string, cond: (n: ts.Node) => boolean) => {
      return findAllNodes(this._source, cond);
    };
    // @ts-ignore
    const getLineAndChar = (fileName: string, position: number) => {
      return ts.getLineAndCharacterOfPosition(this._source, position);
    };
    const resolveTemplateLiteral = (
      // @ts-ignore
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
      schema: schema || null,
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
