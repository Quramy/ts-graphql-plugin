import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import {
  GraphQLLanguageServiceAdapter,
  ScriptSourceHelper,
} from '../graphql-language-service-adapter';
import { findAllNodes, findNode } from '../ts-util';
import { createSimpleSchema } from '../testing/graphql-util/schema/simple-schema';

const notFoundCompletionInfo: ts.CompletionInfo = {
  entries: [],
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
};

const delegateFn = () => notFoundCompletionInfo;

class AdapterFixture {

  adapter: GraphQLLanguageServiceAdapter;
  private _source: ts.SourceFile;

  constructor(name: string, schemaJson?: { data: any }) {
    this._source = ts.createSourceFile(name, '', ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
    const getNode = (fileName: string, position: number) => findNode(this._source, position);
    const getAllNodes = (findNode: string, cond: (n: ts.Node) => boolean) => {
      return findAllNodes(this._source, cond);
    };
    const getLineAndChar = (fileName: string, position: number) => {
      return ts.getLineAndCharacterOfPosition(this._source, position);
    };
    const helper: ScriptSourceHelper = {
      getNode,
      getAllNodes,
      getLineAndChar,
    };
    this.adapter = new GraphQLLanguageServiceAdapter(helper, {
      schema: schemaJson,
      /* tslint:disable:no-console */
      // logger: msg => console.log(msg),
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

function craeteFixture(name: string, schemaJson?: { data: any }) {
  return new AdapterFixture(name, schemaJson);
}

test('should delegate original method when schema is not set', t => {
  const fixture = craeteFixture('input.ts', null);
  const actual = fixture.adapter.getCompletionAtPosition(delegateFn, 'input.ts', 0);
  t.is(actual, notFoundCompletionInfo);
});

test('should delegate original method when the cursor is not on Template String Literal', async t => {
  const fixture = craeteFixture('input.ts', await createSimpleSchema());
  fixture.source = 'const a = 1;';
  const actual = fixture.adapter.getCompletionAtPosition(delegateFn, 'input.ts', 0);
  t.is(actual, notFoundCompletionInfo);
});

test('should return completion entries', async t => {
  const fixture = craeteFixture('input.ts', await createSimpleSchema());
  const completionFn: (p: number) => ts.CompletionInfo =
    fixture.adapter.getCompletionAtPosition.bind(fixture.adapter, delegateFn, 'input.ts');

  fixture.source = 'const a = `';
  t.truthy(completionFn(10).entries.length, 'return entries when cursor is at the start of the template');

  fixture.source = 'const a = `q';
  t.truthy(completionFn(11).entries.length);
  t.deepEqual(completionFn(11).entries, [
    { kind: 'unknown', kindModifiers: 'declare', name: '{', sortText: '0'},
    { kind: 'unknown', kindModifiers: 'declare', name: 'query', sortText: '0'},
  ] as ts.CompletionEntry[]);

  fixture.source = 'const a = `query {';
  t.truthy(completionFn(17).entries);
  t.truthy(completionFn(17).entries.filter(e => e.name === 'hello').length, 'contains schema keyword');

  fixture.source = 'const a = `query { }`';
  t.truthy(completionFn(17).entries);
  t.truthy(completionFn(17).entries.filter(e => e.name === 'hello').length, 'contains schema keyword');
});
