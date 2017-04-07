import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter } from '../lib/graphql-language-service-adapter';
import { findNode } from '../lib/ts-util/index';
import { createSimpleSchema } from './graphql-util/schema/simple-schema';

const notFoundCompletionInfo: ts.CompletionInfo = {
  entries: [],
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
};

function createFixuture(name: string, sourceText: string, schemaJson?: { data: any }) {
  const source = ts.createSourceFile(name, sourceText, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
  function getNode(fileName: string, position: number) {
    return findNode(source, position);
  }
  const getCompletionAtPositionDlgt = () => notFoundCompletionInfo;
  return {
    notFoundCompletionInfo,
    getCompletionAtPositionDlgt,
    adapter: new GraphQLLanguageServiceAdapter(getNode, {
      schema: schemaJson,
      /* tslint:disable:no-console */
      // logger: msg => console.log(msg),
    }),
  };
}

test('should delegate original method when schema is not set', t => {
  const fixture = createFixuture('input.ts', 'const a = 1', null);
  const actual = fixture.adapter.getCompletionAtPosition(fixture.getCompletionAtPositionDlgt, 'input.ts', 0);
  t.is(actual, fixture.notFoundCompletionInfo);
});

test('should delegate original method when the cursor is not on Template String Literal', async t => {
  const fixture = createFixuture('input.ts', 'const a = 1', await createSimpleSchema());
  const actual = fixture.adapter.getCompletionAtPosition(fixture.getCompletionAtPositionDlgt, 'input.ts', 0);
  t.is(actual, fixture.notFoundCompletionInfo);
});

test('should delegate original method when the cursor is not on Template String Literal', async t => {
  const fixture = createFixuture('input.ts', 'const a = `', await createSimpleSchema());
  const actual = fixture.adapter.getCompletionAtPosition(fixture.getCompletionAtPositionDlgt, 'input.ts', 10);
  t.truthy(actual.entries.length);
});

test('should delegate original method when the cursor is not on Template String Literal', async t => {
  const fixture = createFixuture('input.ts', 'const a = `v', await createSimpleSchema());
  const actual = fixture.adapter.getCompletionAtPosition(fixture.getCompletionAtPositionDlgt, 'input.ts', 11);
  t.truthy(actual.entries.length);
  const expected: ts.CompletionEntry[] = [{ kind: 'unknown', kindModifiers: 'declare', name: '{', sortText: '0'}];
  t.deepEqual(actual.entries, expected);
});

test('should delegate original method when the cursor is not on Template String Literal', async t => {
  const fixture = createFixuture('input.ts', 'const a = `v', await createSimpleSchema());
  const actual = fixture.adapter.getCompletionAtPosition(fixture.getCompletionAtPositionDlgt, 'input.ts', 10);
  t.truthy(actual.entries.length);
  const expected: ts.CompletionEntry[] = [{ kind: 'unknown', kindModifiers: 'declare', name: '{', sortText: '0'}];
  t.deepEqual(actual.entries, expected);
});
