import { FragmentRegistry, DefinitionFileStore } from './fragment-registry';

describe(DefinitionFileStore, () => {
  class TestingStore extends DefinitionFileStore<string, null> {
    update(fileName: string, texts: string[]) {
      super.updateDocuments(
        fileName,
        texts.map(text => ({ text, extra: null })),
      );
    }
  }
  const createTestingStore = () => {
    const store = new TestingStore({
      enabledDebugAssertInvaliant: true,
      // ["A, B"]  => [{ name: "A", node: "contentOfA" }, { name: "B", node: "contentOfB" }]
      parse: text =>
        text.split(',').map(f => ({ name: f.trim().split(':')[0], node: `contentOf${f.trim().toUpperCase()}` })),
    });
    return store;
  };

  describe(DefinitionFileStore.prototype.updateDocuments, () => {
    it('shouild not change nothing given empty array', () => {
      const store = createTestingStore();
      store.update('main.ts', []);
      expect(store.getStoreVersion()).toBe(0);
    });

    describe('first regstration', () => {
      describe('when given single text', () => {
        const store = createTestingStore();
        beforeEach(() => {
          store.update('main.ts', ['A']);
        });

        test('correct version', () => {
          expect(store.getStoreVersion()).toBe(1);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toMatchObject(['A']);
        });

        it('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toEqual([]);
        });
      });

      describe('when given text which is parsed to duplicated definitions', () => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A, A']);
        });

        test('correct version', () => {
          expect(store.getStoreVersion()).toBe(1);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual([]);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toMatchObject(['A']);
        });
      });

      describe('when given duplicated texts', () => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A', 'A']);
        });

        test('correct version', () => {
          expect(store.getStoreVersion()).toBe(1);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual([]);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toMatchObject(['A']);
        });
      });

      describe('when given complex duplicated texts', () => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A:0', 'A:1,A:2']);
        });

        test('correct version', () => {
          expect(store.getStoreVersion()).toBe(1);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual([]);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toMatchObject(['A']);
        });
      });

      describe('when given complex texts', () => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A:0', 'A:1,A:2', 'B']);
        });

        test('correct version', () => {
          expect(store.getStoreVersion()).toBe(1);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toMatchObject(['B']);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toMatchObject(['A']);
        });
      });
    });

    describe('updating', () => {
      describe.each`
        docs              | updated  | appeared | disappeared | unique   | duplicated
        ${[]}             | ${[]}    | ${[]}    | ${['A']}    | ${[]}    | ${[]}
        ${['A:0']}        | ${[]}    | ${[]}    | ${[]}       | ${['A']} | ${[]}
        ${['A:1']}        | ${['A']} | ${[]}    | ${[]}       | ${['A']} | ${[]}
        ${['A:1', 'A:2']} | ${[]}    | ${[]}    | ${['A']}    | ${[]}    | ${['A']}
        ${['B:0']}        | ${[]}    | ${['B']} | ${['A']}    | ${['B']} | ${[]}
      `('file1: ["A:0"] -> file1: $docs', ({ docs, ...expected }) => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A:0']);
          store.update('main.ts', docs);
        });

        test('correct history', () => {
          expect([...store.getDetailedAffectedDefinitions(1)[0].updated.values()]).toEqual(expected.updated);
          expect([...store.getDetailedAffectedDefinitions(1)[0].appeared.values()]).toEqual(expected.appeared);
          expect([...store.getDetailedAffectedDefinitions(1)[0].disappeared.values()]).toEqual(expected.disappeared);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual(expected.unique);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toEqual(expected.duplicated);
        });
      });

      describe.each`
        docs              | updated | appeared | disappeared | unique   | duplicated
        ${[]}             | ${[]}   | ${[]}    | ${[]}       | ${[]}    | ${[]}
        ${['A:0']}        | ${[]}   | ${['A']} | ${[]}       | ${['A']} | ${[]}
        ${['A:1']}        | ${[]}   | ${['A']} | ${[]}       | ${['A']} | ${[]}
        ${['A:1', 'A:2']} | ${[]}   | ${[]}    | ${[]}       | ${[]}    | ${['A']}
        ${['B:0']}        | ${[]}   | ${['B']} | ${[]}       | ${['B']} | ${[]}
      `('file1: ["A:0", "A:1"] -> file1: $docs', ({ docs, ...expected }) => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A:0', 'A:1']);
          store.update('main.ts', docs);
        });

        test('correct history', () => {
          expect([...store.getDetailedAffectedDefinitions(1)[0].updated.values()]).toEqual(expected.updated);
          expect([...store.getDetailedAffectedDefinitions(1)[0].appeared.values()]).toEqual(expected.appeared);
          expect([...store.getDetailedAffectedDefinitions(1)[0].disappeared.values()]).toEqual(expected.disappeared);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual(expected.unique);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toEqual(expected.duplicated);
        });
      });

      describe.each`
        docs              | updated | appeared | disappeared | unique | duplicated
        ${['A:0', 'A:1']} | ${[]}   | ${[]}    | ${[]}       | ${[]}  | ${['A']}
      `('file1: ["A:0", "A:1", "A:2"] -> file1: $docs', ({ docs, ...expected }) => {
        let store: TestingStore;
        beforeEach(() => {
          store = createTestingStore();
          store.update('main.ts', ['A:0', 'A:1', 'A:2']);
          store.update('main.ts', docs);
        });

        test('correct history', () => {
          expect([...store.getDetailedAffectedDefinitions(1)[0].updated.values()]).toEqual(expected.updated);
          expect([...store.getDetailedAffectedDefinitions(1)[0].appeared.values()]).toEqual(expected.appeared);
          expect([...store.getDetailedAffectedDefinitions(1)[0].disappeared.values()]).toEqual(expected.disappeared);
        });

        test('correct unique definition', () => {
          expect([...store.getUniqueDefinitonMap().keys()]).toEqual(expected.unique);
        });

        test('correct duplicated definition', () => {
          expect([...store.getDuplicatedDefinitonMap().keys()]).toEqual(expected.duplicated);
        });
      });

      describe.each`
        file1Docs         | file2Docs  | affected      | unique        | duplicated
        ${['A:0', 'B:0']} | ${['A:1']} | ${['B', 'A']} | ${['B']}      | ${['A']}
        ${['B:0']}        | ${['A:0']} | ${['B', 'A']} | ${['B', 'A']} | ${[]}
      `(
        'file1: ["A:0"] -> file2: [] -> file1: $file1Docs -> file2: $file2Docs',
        ({ file1Docs, file2Docs, ...expected }) => {
          let store: TestingStore;
          beforeEach(() => {
            store = createTestingStore();
            store.update('main.ts', ['A:0']);
            store.update('sub.ts', []);
            store.update('main.ts', file1Docs);
            store.update('sub.ts', file2Docs);
          });

          test('correct history', () => {
            expect([...store.getSummarizedAffectedDefinitions(1).values()]).toEqual(expected.affected);
          });

          test('correct unique definition', () => {
            expect([...store.getUniqueDefinitonMap().keys()]).toEqual(expected.unique);
          });

          test('correct duplicated definition', () => {
            expect([...store.getDuplicatedDefinitonMap().keys()]).toEqual(expected.duplicated);
          });
        },
      );
    });
  });
});

describe(FragmentRegistry, () => {
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
