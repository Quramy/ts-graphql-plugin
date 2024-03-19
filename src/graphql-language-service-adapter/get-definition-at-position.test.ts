import { mark, type Frets } from 'fretted-strings';
import { AdapterFixture } from './testing/adapter-fixture';

function createFixture(name: string) {
  return new AdapterFixture(name);
}

describe('getDefinitionAtPosition', () => {
  const delegateFn = jest.fn(() => []);

  it('should not return definition info when the cursor does not point fragment spread', () => {
    const fixture = createFixture('input.ts');
    const frets: Frets = {};
    fixture.source = mark(
      `
        const query = \`
          query MyQuery {
       %%%      ^                         %%%
       %%%      cur                       %%%
            ...MyFragment
          }

          fragment MyFragment on Query {
            __typename
          }
        \`;
      `,
      frets,
    );
    const actual = fixture.adapter.getDefinitionAtPosition(delegateFn, 'input.ts', frets.cur.pos);
    expect(actual?.length).toBe(0);
  });

  it('should return definition of fragment spread under cursor', () => {
    const fixture = createFixture('input.ts');
    const frets: Frets = {};
    fixture.source = mark(
      `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%     ^                          %%%
       %%%     cur                        %%%
          }

          fragment MyFragment on Query {
            __typename
          }
        \`;
      `,
      frets,
    );
    const actual = fixture.adapter.getDefinitionAtPosition(delegateFn, 'input.ts', frets.cur.pos);
    expect(actual?.length).toBe(1);
  });
});
