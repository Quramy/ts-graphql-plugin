import ts from 'typescript';
import { createSimpleSchema } from '../testing/graphql-util/schema/simple-schema';
import { AdapterFixture } from '../testing/adapter-fixture';
import { contentMark, Markers } from '../testing/content-mark';

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

function createFixture(name: string, schemaJson?: { data: any }) {
  return new AdapterFixture(name, schemaJson);
}
describe('getQuickInfoAtPosition', () => {
  it('should return GraphQL quick info', async () => {
    const fixture = createFixture('main.ts', await createSimpleSchema());
    const quickInfoFn = fixture.adapter.getQuickInfoAtPosition.bind(fixture.adapter, delegateFn, 'main.ts');
    const markers: Markers = {};
    fixture.source = contentMark(
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
