import { parse, type DocumentNode, FragmentDefinitionNode, visit } from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import { LRUCache } from '../cache';
import { getFragmentsInDocument, getFragmentNamesInDocument } from './utility-functions';

function union<T>(...sets: Set<T>[]) {
  return new Set(sets.map(s => [...s.values()]).flat());
}

function intersect<T>(a: Set<T>, b: Set<T>) {
  const [x, y] = a.size < b.size ? [new Set(a), new Set(b)] : [new Set(b), new Set(a)];
  const ret = new Set<T>();
  for (const v of x.values()) {
    if (y.has(v)) {
      ret.add(v);
      x.delete(v);
      y.delete(v);
    }
  }
  if (a.size < b.size) {
    return [ret, x, y] as const;
  } else {
    return [ret, y, x] as const;
  }
}

function compare<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  let result = true;
  for (const key of a.keys()) {
    result &&= b.has(key);
  }
  return result;
}

function groupBy<S, TKey extends keyof S>(arr: S[], keyPropName: TKey) {
  const map = new Map<S[TKey], S[]>();
  for (const item of arr) {
    const hit = map.get(item[keyPropName]);
    if (hit) {
      hit.push(item);
    } else {
      map.set(item[keyPropName], [item]);
    }
  }
  return map;
}

type DefinitionAST = unknown;

type DefinitionParser<T extends DefinitionAST> = (documentString: string) => { name: string; node: T }[];

type DefinitionEntry<T extends DefinitionAST, TExtra> = {
  fileName: string;
  extra: TExtra;
  documentString: string;
  definitionName: string;
  node: T;
};

type AffectedDefinitonNameHistoryEntry = {
  updated: Set<string>;
  appeared: Set<string>;
  disappeared: Set<string>;
};

export class DefinitionFileStore<T extends DefinitionAST, TExtra = unknown> {
  private _storeVersion = 0;
  private _affectedDefinitonNameHistories: AffectedDefinitonNameHistoryEntry[] = [];

  private _mapByFileName = new Map<string, DefinitionEntry<T, TExtra>[]>();

  private _uniqueRecordMap = new Map<string, DefinitionEntry<T, TExtra>>();
  private _duplicatedRecordMap = new Map<string, DefinitionEntry<T, TExtra>[]>();

  private _parse: DefinitionParser<T>;
  private _enabledDebugAssertInvaliant: boolean;

  constructor({
    parse,
    enabledDebugAssertInvaliant = false,
  }: {
    parse: DefinitionParser<T>;
    enabledDebugAssertInvaliant?: boolean;
  }) {
    this._parse = parse;
    this._enabledDebugAssertInvaliant = enabledDebugAssertInvaliant;
  }

  assertInvariant() {
    if (intersect(new Set(this._uniqueRecordMap.keys()), new Set(this._duplicatedRecordMap.keys()))[0].size > 0) {
      throw new Error('There should be no intersected keys between _duplicatedRecordMap and _uniqueRecordMap');
    }
    if (
      !compare(
        new Set([...this._mapByFileName.values()].flat()),
        union(new Set(this._uniqueRecordMap.values()), new Set([...this._duplicatedRecordMap.values()].flat())),
      )
    ) {
      throw new Error('All values in _mapByFileName should appear _uniqueRecordMap or _duplicatedRecordMap');
    }
  }

  getStoreVersion() {
    return this._storeVersion;
  }

  getDetailedAffectedDefinitions(from: number) {
    return this._affectedDefinitonNameHistories.slice(from);
  }

  getSummarizedAffectedDefinitions(from: number) {
    return union(
      ...this._affectedDefinitonNameHistories.slice(from).flatMap(x => [x.appeared, x.disappeared, x.updated]),
    );
  }

  getUniqueDefinitonMap() {
    return this._uniqueRecordMap;
  }

  getDuplicatedDefinitonMap() {
    return this._duplicatedRecordMap;
  }

  updateDocuments(fileName: string, documents: { text: string; extra: TExtra }[]) {
    this._assert();

    if (!documents.length && !this._mapByFileName.has(fileName)) return;

    const currentValues = this._mapByFileName.get(fileName) ?? [];
    const currentValueMapByText = groupBy(currentValues, 'documentString');
    const valuesNotChanged: typeof currentValues = [];
    const valuesToBeAdded: typeof currentValues = [];

    for (const doc of documents) {
      const alreadyParsedItems = currentValueMapByText.get(doc.text);
      if (alreadyParsedItems) {
        alreadyParsedItems.forEach(v => {
          v.extra = doc.extra;
          valuesNotChanged.push(v);
        });
        currentValueMapByText.delete(doc.text);
        continue;
      }

      for (const parsed of this._parse(doc.text)) {
        valuesToBeAdded.push({
          fileName,
          extra: doc.extra,
          documentString: doc.text,
          definitionName: parsed.name,
          node: parsed.node,
        });
      }
    }

    const valuesToBeRemoved = [...currentValueMapByText.values()].flat();

    const { namesRemoved, namesFromDuplicatedToUnique } = this._removeValueFromRecordMaps(...valuesToBeRemoved);
    const { namesAcquiredAsUnique, namesToDuplicatedFromUnique } = this._addValueToRecordMaps(...valuesToBeAdded);
    const [namesUpdated, namesFullyRemoved, namesFullyAppeared] = intersect(namesRemoved, namesAcquiredAsUnique);
    const [, namesRecovered, namesHidden] = intersect(namesFromDuplicatedToUnique, namesToDuplicatedFromUnique);
    const namesAppeared = union(namesFullyAppeared, namesRecovered);
    const namesDisappeared = union(namesFullyRemoved, namesHidden);
    this._affectedDefinitonNameHistories[this._storeVersion] = {
      updated: namesUpdated,
      appeared: namesAppeared,
      disappeared: namesDisappeared,
    };
    this._mapByFileName.set(fileName, [...valuesNotChanged, ...valuesToBeAdded]);
    this._storeVersion++;

    this._assert();
  }

  private _assert() {
    if (this._enabledDebugAssertInvaliant) {
      try {
        this.assertInvariant();
      } catch (e) {
        /* eslint-disable no-console */
        console.log('_mapByFileName:', this._mapByFileName);
        console.log('_uniqueRecordMap:', this._uniqueRecordMap);
        console.log('_duplicatedRecordMap:', this._duplicatedRecordMap);
        /* eslint-enable no-console */
        throw e;
      }
    }
  }

  private _addValueToRecordMaps(...values: DefinitionEntry<T, TExtra>[]) {
    const namesAcquiredAsUnique = new Set<string>();
    const namesToDuplicatedFromUnique = new Set<string>();
    for (const v of values) {
      const name = v.definitionName;

      const alreadyStoredValuesAsDuplicated = this._duplicatedRecordMap.get(name);
      if (alreadyStoredValuesAsDuplicated) {
        alreadyStoredValuesAsDuplicated?.push(v);
        continue;
      }

      const alreadyStoredValueAsUnique = this._uniqueRecordMap.get(name);
      if (alreadyStoredValueAsUnique) {
        this._uniqueRecordMap.delete(name);
        this._duplicatedRecordMap.set(name, [alreadyStoredValueAsUnique, v]);
        namesToDuplicatedFromUnique.add(name);
      } else {
        this._uniqueRecordMap.set(name, v);
        namesAcquiredAsUnique.add(name);
      }
    }

    for (const name of namesAcquiredAsUnique.values()) {
      if (!this._uniqueRecordMap.has(name)) {
        namesAcquiredAsUnique.delete(name);
      }
    }

    return { namesAcquiredAsUnique, namesToDuplicatedFromUnique };
  }

  private _removeValueFromRecordMaps(...values: DefinitionEntry<T, TExtra>[]) {
    const namesFromDuplicatedToUnique = new Set<string>();
    const namesRemoved = new Set<string>();
    for (const v of values) {
      const name = v.definitionName;

      const alreadyStoredValueAsUnique = this._uniqueRecordMap.get(name);
      if (alreadyStoredValueAsUnique) {
        this._uniqueRecordMap.delete(name);
        namesRemoved.add(name);
        continue;
      }

      const alreadyStoredValuesAsDuplicated = this._duplicatedRecordMap.get(name);
      if (alreadyStoredValuesAsDuplicated && alreadyStoredValuesAsDuplicated.length == 2) {
        const [a, b] = alreadyStoredValuesAsDuplicated;
        const itemToBeKept = a === v ? b : a;
        this._uniqueRecordMap.set(name, itemToBeKept);
        this._duplicatedRecordMap.delete(name);
        namesFromDuplicatedToUnique.add(name);
      } else if (alreadyStoredValuesAsDuplicated && alreadyStoredValuesAsDuplicated.length > 2) {
        const s = new Set(alreadyStoredValuesAsDuplicated);
        s.delete(v);
        this._duplicatedRecordMap.set(name, [...s.values()]);
      }
    }

    for (const name of namesFromDuplicatedToUnique.values()) {
      if (!this._uniqueRecordMap.has(name)) {
        namesFromDuplicatedToUnique.delete(name);
      }
    }

    return {
      namesFromDuplicatedToUnique,
      namesRemoved,
    };
  }
}

type FileName = string;
type FileVersion = string;

type ExternalFragmentsCacheEntry = {
  storeVersion: number;
  internalFragmentNames: string[];
  referencedFragmentNames: string[];
  externalFragments: FragmentDefinitionNode[];
};

type FragmentRegistryCreateOptions = {
  logger: (msg: string) => void;
};

export class FragmentRegistry {
  private _fileVersionMap = new Map<FileName, FileVersion>();

  private _store = new DefinitionFileStore<FragmentDefinitionNode, { sourcePosition: number }>({
    parse: documentStr => {
      try {
        const documentNode = parse(documentStr);
        return getFragmentsInDocument(documentNode).map(node => ({ node, name: node.name.value }));
      } catch {
        return [];
      }
    },
  });

  private _externalFragmentsCache = new LRUCache<string, ExternalFragmentsCacheEntry>(200);
  private _logger: (msg: string) => void;

  constructor(options: FragmentRegistryCreateOptions = { logger: () => null }) {
    this._logger = options.logger;
  }

  getFileCurrentVersion(fileName: string) {
    return this._fileVersionMap.get(fileName);
  }

  getFragmentDefinitions(fragmentNamesToBeIgnored: string[] = []): FragmentDefinitionNode[] {
    return [...this._store.getUniqueDefinitonMap().entries()]
      .filter(([name]) => !fragmentNamesToBeIgnored.includes(name))
      .map(([, v]) => v.node);
  }

  getExternalFragments(documentStr: string, fileName: string, sourcePosition: number): FragmentDefinitionNode[] {
    let documentNode: DocumentNode | undefined = undefined;
    try {
      documentNode = parse(documentStr);
    } catch {
      // Nothing to do
    }
    if (!documentNode) return [];
    const names = getFragmentNamesInDocument(documentNode);
    const cacheKey = `${fileName}:${sourcePosition}`;
    const cachedValue = this._externalFragmentsCache.get(cacheKey);
    if (cachedValue) {
      if (compare(new Set(cachedValue.internalFragmentNames), new Set(names))) {
        const changed = this._store.getSummarizedAffectedDefinitions(cachedValue.storeVersion);
        let affectd = false;
        const referencedFragmentNames = new Set<string>();
        visit(documentNode, {
          FragmentSpread: node => {
            affectd ||= changed.has(node.name.value);
            referencedFragmentNames.add(node.name.value);
          },
        });
        if (!affectd && compare(referencedFragmentNames, new Set(cachedValue.referencedFragmentNames))) {
          this._logger('getExternalFragments: use cached value');
          return cachedValue.externalFragments;
        }
      }
    }
    const map = new Map(
      [...this._store.getUniqueDefinitonMap().entries()]
        .filter(([name]) => !names.includes(name))
        .map(([k, v]) => [k, v.node]),
    );
    const externalFragments = getFragmentDependenciesForAST(documentNode, map);
    const referencedFragmentNames: string[] = [];
    visit(documentNode, {
      FragmentSpread: node => {
        referencedFragmentNames.push(node.name.value);
      },
    });
    this._externalFragmentsCache.set(cacheKey, {
      storeVersion: this._store.getStoreVersion(),
      internalFragmentNames: names,
      externalFragments,
      referencedFragmentNames,
    });
    return externalFragments;
  }

  registerDocument(
    fileName: string,
    version: string,
    documentStrings: { text: string; sourcePosition: number }[],
  ): void {
    this._fileVersionMap.set(fileName, version);
    this._store.updateDocuments(
      fileName,
      documentStrings.map(({ text, sourcePosition }) => ({ text, extra: { sourcePosition } })),
    );
  }

  removeDocument(fileName: string): void {
    this._store.updateDocuments(fileName, []);
  }
}
