import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import { AdapterFixture } from '../testing/adapter-fixture';
import { createSimpleSchema } from '../testing/graphql-util/schema/simple-schema';

const notFoundCompletionInfo: ts.CompletionInfo = {
  entries: [],
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
};

const delegateFn = () => notFoundCompletionInfo;

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
