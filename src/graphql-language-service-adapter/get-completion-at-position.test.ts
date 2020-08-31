import * as ts from 'typescript/lib/tsserverlibrary';
import { AdapterFixture } from './testing/adapter-fixture';
import { createSimpleSchema } from './testing/simple-schema';
import { GraphQLSchema } from 'graphql';

const notFoundCompletionInfo: ts.CompletionInfo = {
  entries: [],
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
};

const delegateFn = () => notFoundCompletionInfo;

function createFixture(name: string, schema?: GraphQLSchema) {
  return new AdapterFixture(name, schema);
}

describe('getCompletionAtPosition', () => {
  it('should delegate original method when schema is not set', () => {
    const fixture = createFixture('input.ts');
    const actual = fixture.adapter.getCompletionAtPosition(delegateFn, 'input.ts', 0, undefined);
    expect(actual).toBe(notFoundCompletionInfo);
  });

  it('should delegate original method when the cursor is not on Template String Literal', () => {
    const fixture = createFixture('input.ts', createSimpleSchema());
    fixture.source = 'const a = 1;';
    const actual = fixture.adapter.getCompletionAtPosition(delegateFn, 'input.ts', 0, undefined);
    expect(actual).toBe(notFoundCompletionInfo);
  });

  it('should return completion entries', () => {
    const fixture = createFixture('input.ts', createSimpleSchema());
    const completionFn = fixture.adapter.getCompletionAtPosition.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = 'const a = `';
    expect(completionFn(10, undefined)!.entries.length).toBeTruthy(); // return entries when cursor is at the start of the template

    fixture.source = 'const a = `q';
    expect(completionFn(11, undefined)!.entries.length);
    expect(completionFn(11, undefined)!.entries).toEqual([
      { kind: '4' as ts.ScriptElementKind, kindModifiers: 'declare', name: '{', sortText: '0' },
      { kind: '3' as ts.ScriptElementKind, kindModifiers: 'declare', name: 'query', sortText: '0' },
    ] as ts.CompletionEntry[]);

    fixture.source = 'const a = `query {';
    expect(completionFn(17, undefined)!.entries).toBeTruthy();
    expect(completionFn(17, undefined)!.entries.filter(e => e.name === 'hello').length).toBeTruthy(); // contains schema keyword;

    fixture.source = 'const a = `query { }`';
    expect(completionFn(17, undefined)!.entries).toBeTruthy();
    expect(completionFn(17, undefined)!.entries.filter(e => e.name === 'hello').length).toBeTruthy(); // contains schema keyword;
  });
});
