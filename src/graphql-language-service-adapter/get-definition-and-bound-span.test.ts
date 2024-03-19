import ts from 'typescript';
import { mark, type Frets } from 'fretted-strings';
import { AdapterFixture } from './testing/adapter-fixture';

function createFixture(name: string) {
  return new AdapterFixture(name);
}

describe('getDefinitionAndBoundSpan', () => {
  const delegateFn = jest.fn(() => undefined);

  beforeEach(() => {
    delegateFn.mockClear();
  });

  it.each([
    {
      name: 'cursor on not template leteral',
      source: `
        const query = 100;
    %%%               ^    %%%
    %%%               s1   %%%
      `,
    },
    {
      name: 'incomplete operation',
      source: `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%    ^                          %%%
       %%%    s1                         %%%
        \`;
      `,
    },
    {
      name: 'cursor on not fragment spread',
      source: `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%    ^                          %%%
       %%%    s1                         %%%
          }

          fragment MyFragment on Query {
            __typename
          }
        \`;
      `,
    },
    {
      name: 'not exsisting fragment definition',
      source: `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%     ^                         %%%
       %%%     s1                        %%%
          }

          fragment OtherFragment on Query {
            __typename
          }
        \`;
      `,
    },
  ])('should not return nothing for $name .', ({ source }) => {
    const fixture = createFixture('input.ts');
    const frets: Frets = {};
    fixture.source = mark(source, frets);
    fixture.adapter.getDefinitionAndBoundSpan(delegateFn, 'input.ts', frets.s1.pos);
    expect(delegateFn).toHaveBeenCalledTimes(1);
  });

  it('should return definition info when cursor is on fragment spread', () => {
    const fixture = createFixture('input.ts');
    const frets: Frets = {};
    fixture.source = mark(
      `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%     ^         ^                %%%
       %%%     s1        s2               %%%
          }

          fragment MyFragment on Query {
       %%%         ^         ^            %%%
       %%%         d1        d2           %%%
            __typename
          }
        \`;
      `,
      frets,
    );
    const actual = fixture.adapter.getDefinitionAndBoundSpan(delegateFn, 'input.ts', frets.s1.pos);
    expect(actual).toMatchObject({
      textSpan: {
        start: frets.s1.pos,
        length: frets.s2.pos - frets.s1.pos,
      },
      definitions: [
        {
          fileName: 'input.ts',
          textSpan: {
            start: frets.d1.pos,
            length: frets.d2.pos - frets.d1.pos,
          },
        },
      ] as Partial<ts.DefinitionInfo>[],
    });
  });

  it('should return definition to other file', () => {
    const fixture = createFixture('input.ts');
    const frets: Frets = {};
    fixture.registerFragment(
      'fragments.ts',
      `
        fragment MyFragment on Query {
          __typename
        }
      `,
    ).source = mark(
      `
        const query = \`
          query MyQuery {
            ...MyFragment
       %%%     ^           %%%
       %%%     s1          %%%
          }
        \`;
      `,
      frets,
    );
    const actual = fixture.adapter.getDefinitionAndBoundSpan(delegateFn, 'input.ts', frets.s1.pos);
    expect(actual?.definitions?.[0].fileName).toBe('fragments.ts');
  });
});
