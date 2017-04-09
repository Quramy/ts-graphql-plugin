import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import { AdapterFixture } from '../testing/adapter-fixture';
import { createSimpleSchema } from '../testing/graphql-util/schema/simple-schema';

function craeteFixture(name: string, schemaJson?: { data: any }) {
  return new AdapterFixture(name, schemaJson);
}

const defaultSemanticDigostics: ts.Diagnostic[] = [];

const delegateFn = () => defaultSemanticDigostics;

test('should delegate original fn when schema is not set', t => {
  const fixture = craeteFixture('input.ts');
  const actual = fixture.adapter.getSemanticDiagnostics(delegateFn, 'input.ts');
  t.is(actual, defaultSemanticDigostics);
});

test('should validate GraphQL syntax in template string', async t => {
  const fixture = craeteFixture('input.ts', await createSimpleSchema());
  const validateFn: () => ts.Diagnostic[]
    = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

  fixture.source = 'const ql = `';
  const [actual1] = validateFn();
  const messageText = actual1.messageText as string;
  t.truthy(messageText.match(/Syntax Error GraphQL/));
  t.is(actual1.start, 12, 'start character');

  fixture.source = 'const ql = `' + '\n'
                 + '{`';
  const [actual2] = validateFn();
  t.is(actual2.start, 13, 'start character (multiline)');

  fixture.source = 'const ql = `query { hello }`';
  t.deepEqual(validateFn(), [], 'no errors for valid query');

  fixture.source = 'const ql = `query {' + '\n'
                             + '  hello' + '\n'
                             + ' }`';
  t.deepEqual(validateFn(), [], 'no errors for valid query (multiline)');
});
