import ts from 'typescript';
import { GraphQLSchema } from 'graphql';
import {
  findAllNodes,
  findNode,
  createResultForNoSubstitution,
  ScriptSourceHelper,
  TemplateExpressionResolver,
} from '../../ts-ast-util';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';

export class AdapterFixture {
  adapter: GraphQLLanguageServiceAdapter;
  private _source: ts.SourceFile;

  constructor(scriptFileName: string, schema?: GraphQLSchema) {
    this._source = ts.createSourceFile(scriptFileName, '', ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
    const getNode = (_: string, position: number) => findNode(this._source, position);
    const getAllNodes = (_: string, cond: (n: ts.Node) => boolean) => findAllNodes(this._source, cond);
    const getLineAndChar = (_: string, position: number) => ts.getLineAndCharacterOfPosition(this._source, position);
    const resolveTemplateLiteral = (_: string, node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression) => {
      if (ts.isTemplateExpression(node)) {
        throw new Error('not implemented');
      } else {
        return {
          resolvedInfo: createResultForNoSubstitution(node, scriptFileName),
          resolveErrors: [],
        };
      }
    };
    const helper: ScriptSourceHelper = {
      getNode,
      getAllNodes,
      getLineAndChar,
      resolveTemplateLiteral,
      updateTemplateLiteralInfo: TemplateExpressionResolver.prototype.update,
    };
    this.adapter = new GraphQLLanguageServiceAdapter(helper, {
      schema: schema || null,
      removeDuplicatedFragments: true,
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
