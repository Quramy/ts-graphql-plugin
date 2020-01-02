import ts from 'typescript';
import { createSimpleSchema } from './testing/simple-schema';
import { AdapterFixture } from './testing/adapter-fixture';
import { mark, Markers } from '../string-util/testing/position-marker';
import { GraphQLSchema } from 'graphql';

function delegateFn(): ts.QuickInfo {
  return {
    kind: ts.ScriptElementKind.string,
    kindModifiers: '',
    textSpan: {
      start: 0,
      length: 0,
    },
    displayParts: [],
  };
}

function createFixture(name: string, schema?: GraphQLSchema) {
  return new AdapterFixture(name, schema);
}
describe('getQuickInfoAtPosition', () => {
  it('should return GraphQL quick info', () => {
    const fixture = createFixture('main.ts', createSimpleSchema());
    const quickInfoFn = fixture.adapter.getQuickInfoAtPosition.bind(fixture.adapter, delegateFn, 'main.ts');
    const markers: Markers = {};
    fixture.source = mark(
      `
        const query = \`
          query {
            hello
    %%%     ^   ^       %%%
    %%%     a1  a2      %%%
          }
        \`;
    `,
      markers,
    );
    expect(quickInfoFn(markers.a1.pos - 1)!.displayParts).toEqual([]);
    expect(
      quickInfoFn(markers.a1.pos)!
        .displayParts!.map(dp => dp.text)
        .join(''),
    ).toMatchSnapshot();
    expect(
      quickInfoFn(markers.a2.pos)!
        .displayParts!.map(dp => dp.text)
        .join(''),
    ).toMatchSnapshot();
    expect(quickInfoFn(markers.a2.pos + 1)!.displayParts).toEqual([]);
  });
});
