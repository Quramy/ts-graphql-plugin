import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter } from '../lib/graphql-language-service-adapter';
import { findNode } from '../lib/ts-util/index';

function createFixuture(name: string, sourceText: string) {
  const source = ts.createSourceFile(name, sourceText, ts.ScriptTarget.ES2015, false, ts.ScriptKind.TS);
  function getNode(fileName: string, position: number) {
    return findNode(source, position);
  }
  const notFindCompletionInfo: ts.CompletionInfo = {
    entries: [],
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
  };

  const getCompletionInfoDelegate = () => notFindCompletionInfo;
  return {
    notFindCompletionInfo,
    getCompletionInfoDelegate,
    adapter: new GraphQLLanguageServiceAdapter(getNode, {
      /* tslint:disable:no-console */
      logger: msg => console.log(msg),
    }),
  };
}

test('should delegate original method when schema is not set', t => {
  const fixture = createFixuture('input.ts', 'const a = 1');
  const actual = fixture.adapter.getCompletionInfo(fixture.getCompletionInfoDelegate, 'input.ts', 1);
  t.is(actual, fixture.notFindCompletionInfo);
});
