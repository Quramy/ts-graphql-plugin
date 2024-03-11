import { FragmentRegistry } from './fragment-registry';

describe(FragmentRegistry, () => {
  describe(FragmentRegistry.prototype.getRegistrationHistory, () => {
    it('should store added fragment names', () => {
      const registry = new FragmentRegistry();
      registry.registerDocument('main.ts', '0', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
      ]);

      const history = registry.getRegistrationHistory();
      expect(history.length).toBe(1);
      expect(history[0].has('FragmentA')).toBeTruthy();
    });

    it('should store changed fragment names', () => {
      const registry = new FragmentRegistry();
      registry.registerDocument('main.ts', '0', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
        {
          sourcePosition: 0,
          text: `
            fragment FragmentB on Query {
              __typename
            }
          `,
        },
      ]);

      registry.registerDocument('main.ts', '1', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
        {
          sourcePosition: 0,
          text: `
            fragment FragmentC on Query {
              __typename
            }
          `,
        },
      ]);

      const history = registry.getRegistrationHistory();
      expect(history.length).toBe(2);
      expect(history[1].has('FragmentA')).toBeFalsy();
      expect(history[1].has('FragmentB')).toBeTruthy();
      expect(history[1].has('FragmentC')).toBeTruthy();
    });

    it('should store removed fragment names', () => {
      const registry = new FragmentRegistry();
      registry.registerDocument('main.ts', '0', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
      ]);
      registry.removeDocument('main.ts');

      const history = registry.getRegistrationHistory();
      expect(history.length).toBe(2);
      expect(history[1].has('FragmentA')).toBeTruthy();
    });
  });

  describe(FragmentRegistry.prototype.getExternalFragments, () => {
    it('should return empty array when target document can not be parsed', () => {
      const registry = new FragmentRegistry();
      registry.registerDocument('fragments.ts', '0', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
      ]);
      registry.registerDocument('main.ts', '0', [{ sourcePosition: 0, text: 'fragment X on Query {' }]);

      expect(registry.getExternalFragments('fragment X on Query {', 'main.ts', 0)).toEqual([]);
    });

    it('should return dependent fragment definitions', () => {
      const registry = new FragmentRegistry();
      registry.registerDocument('fragments.ts', '0', [
        {
          sourcePosition: 0,
          text: `
            fragment FragmentA on Query {
              __typename
            }
          `,
        },
        {
          sourcePosition: 0,
          text: `
            fragment FragmentX on Query {
              __typename
            }
          `,
        },
      ]);
      registry.registerDocument('main.ts', '0', [
        { sourcePosition: 0, text: 'fragment FragmentB on Query { ...FragmentA }' },
      ]);

      const actual = registry.getExternalFragments('fragment FragmentB on Query { ...FragmentA }', 'main.ts', 0);
      expect(actual.length).toBe(1);
      expect(actual[0].name.value).toBe('FragmentA');
    });

    describe('cache', () => {
      it('should not use cached value when dependent fragment changes', () => {
        const logger = jest.fn();
        const registry = new FragmentRegistry({ logger });
        registry.registerDocument('fragments.ts', '0', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
              }
            `,
          },
        ]);

        registry.registerDocument('main.ts', '0', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA }' },
        ]);
        registry.getExternalFragments('fragment FragmentX on Query { ...FragmentA }', 'main.ts', 0);
        expect(logger).toBeCalledTimes(0);

        registry.registerDocument('fragments.ts', '1', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
                id
              }
            `,
          },
        ]);

        const actual = registry.getExternalFragments('fragment FragmentX on Query { ...FragmentA }', 'main.ts', 0);

        expect(logger).toBeCalledTimes(0);
        expect(actual.length).toBe(1);
        expect(actual[0].name.value).toBe('FragmentA');
      });

      it('should not use cached value when FragmentSpread set in target documentString changes', () => {
        const logger = jest.fn();
        const registry = new FragmentRegistry({ logger });
        registry.registerDocument('fragments.ts', '0', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
              }
            `,
          },
          {
            sourcePosition: 0,
            text: `
              fragment FragmentB on Query {
                __typename
              }
            `,
          },
        ]);
        registry.registerDocument('main.ts', '0', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA }' },
        ]);

        registry.getExternalFragments('fragment FragmentX on Query { ...FragmentA }', 'main.ts', 0);
        expect(logger).toBeCalledTimes(0);

        registry.registerDocument('main.ts', '1', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA, ...FragmentB }' },
        ]);

        const actual = registry.getExternalFragments(
          'fragment FragmentX on Query { ...FragmentA, ...FragmentB }',
          'main.ts',
          0,
        );

        expect(logger).toBeCalledTimes(0);
        expect(actual.length).toBe(2);
      });

      it('should not use cached value when FragmentDefinition set in target documentString changes', () => {
        const logger = jest.fn();
        const registry = new FragmentRegistry({ logger });
        registry.registerDocument('fragments.ts', '0', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
              }
            `,
          },
        ]);
        registry.registerDocument('main.ts', '0', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA }' },
        ]);

        registry.getExternalFragments('fragment FragmentX on Query { ...FragmentA }', 'main.ts', 0);
        expect(logger).toBeCalledTimes(0);

        registry.registerDocument('main.ts', '1', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
              }
              fragment FragmentX on Query { ...FragmentA, ...FragmentB }
            `,
          },
        ]);

        const actual = registry.getExternalFragments(
          `
            fragment FragmentA on Query {
              __typename
            }
            fragment FragmentX on Query { ...FragmentA, ...FragmentB }
          `,
          'main.ts',
          0,
        );

        expect(logger).toBeCalledTimes(0);
        expect(actual.length).toBe(0);
      });

      it('should use cached value', () => {
        const logger = jest.fn();
        const registry = new FragmentRegistry({ logger });
        registry.registerDocument('fragments.ts', '0', [
          {
            sourcePosition: 0,
            text: `
              fragment FragmentA on Query {
                __typename
              }
            `,
          },
          {
            sourcePosition: 0,
            text: `
              fragment FragmentB on Query {
                __typename
              }
            `,
          },
        ]);
        registry.registerDocument('main.ts', '0', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA }' },
        ]);

        registry.getExternalFragments('fragment FragmentX on Query { ...FragmentA }', 'main.ts', 0);
        expect(logger).toBeCalledTimes(0);

        registry.registerDocument('main.ts', '1', [
          { sourcePosition: 0, text: 'fragment FragmentX on Query { ...FragmentA, __typename }' },
        ]);

        const actual = registry.getExternalFragments(
          'fragment FragmentX on Query { ...FragmentA, __typename }',
          'main.ts',
          0,
        );

        expect(logger).toBeCalledTimes(1);
        expect(actual.length).toBe(1);
        expect(actual[0].name.value).toBe('FragmentA');
      });
    });
  });
});
