import { parse, type DocumentNode, FragmentDefinitionNode, visit } from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import { LRUCache } from '../cache';
import { getFragmentsInDocument, getFragmentNamesInDocument } from './utility-functions';

type FileName = string;
type FileVersion = string;

type FragmentDefinitionEntry = {
  fileName: string;
  sourcePosition: number;
  text: string;
  name: string;
  node: FragmentDefinitionNode;
};

type ExternalFragmentsCacheEntry = {
  registryVersion: number;
  internalFragmentNames: string[];
  referencedFragmentNames: string[];
  externalFragments: FragmentDefinitionNode[];
};

type UniqueDefinitionsResult = {
  registryVersion: number;
  validDefinitions: Map<string, FragmentDefinitionEntry>;
  duplicatedDefinitions: Map<string, FragmentDefinitionEntry[]>;
};

type FragmentRegistryCreateOptions = {
  logger: (msg: string) => void;
};

function compareSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  let result = true;
  for (const key of a.keys()) {
    result &&= b.has(key);
  }
  return result;
}

export class FragmentRegistry {
  private _registryVersion = 0;
  private _registrationHistroy: Set<string>[] = [];
  private _fileVersionMap = new Map<FileName, FileVersion>();
  private _fragmentsMap = new Map<FileName, FragmentDefinitionEntry[]>();
  private _externalFragmentsCache = new LRUCache<string, ExternalFragmentsCacheEntry>(200);
  private _uniqueDefinitionsCache = new LRUCache<string, UniqueDefinitionsResult>(200);
  private _logger: (msg: string) => void;

  constructor(options: FragmentRegistryCreateOptions = { logger: () => null }) {
    this._logger = options.logger;
  }

  getFileCurrentVersion(fileName: string): string | undefined {
    return this._fileVersionMap.get(fileName);
  }

  getRegistrationHistory() {
    return this._registrationHistroy;
  }

  getFragmentDefinitions(fragmentNamesToBeIgnored: string[] = []): FragmentDefinitionNode[] {
    return [...this._fragmentsMap.values()]
      .flat()
      .map(x => x.node)
      .filter(def => !fragmentNamesToBeIgnored.includes(def.name.value));
  }

  getUniqueDefinitions(fragmentNamesToBeIgnored: string[] = []) {
    if (fragmentNamesToBeIgnored.length === 0) {
      return this._getWholeDefinitions();
    }
    const cacheKey = fragmentNamesToBeIgnored.join(',');
    const cachedValue = this._uniqueDefinitionsCache.get(cacheKey);
    if (cachedValue) {
      const changed = new Set(
        this._registrationHistroy
          .slice(cachedValue.registryVersion)
          .reduce((acc, nameSet) => [...acc, ...nameSet.keys()], [] as string[]),
      );
      const ignored = new Set(fragmentNamesToBeIgnored);
      let notAffected = true;
      for (const name of changed) {
        notAffected &&= ignored.has(name);
      }
      if (notAffected) {
        const { validDefinitions, duplicatedDefinitions } = cachedValue;
        return {
          validDefinitions,
          duplicatedDefinitions,
        };
      }
    }

    const wholeDefinitions = this._getWholeDefinitions();
    const validDefinitions = new Map(wholeDefinitions.validDefinitions);
    const duplicatedDefinitions = new Map(wholeDefinitions.duplicatedDefinitions);
    for (const name of fragmentNamesToBeIgnored) {
      validDefinitions.delete(name);
      duplicatedDefinitions.delete(name);
    }
    const cacheEntry = {
      registryVersion: this._registryVersion,
      validDefinitions,
      duplicatedDefinitions,
    } satisfies UniqueDefinitionsResult;
    this._uniqueDefinitionsCache.set(cacheKey, cacheEntry);
    return {
      validDefinitions,
      duplicatedDefinitions,
    };
  }

  getExternalFragments(documentStr: string, fileName: string, sourcePosition: number): FragmentDefinitionNode[] {
    let docNode: DocumentNode | undefined = undefined;
    try {
      docNode = parse(documentStr);
    } catch {
      // Nothing to do
    }
    if (!docNode) return [];
    const names = getFragmentNamesInDocument(docNode);
    const cacheKey = `${fileName}:${sourcePosition}`;
    const cachedValue = this._externalFragmentsCache.get(cacheKey);
    if (cachedValue) {
      if (compareSet(new Set(cachedValue.internalFragmentNames), new Set(names))) {
        const changed = new Set(
          this._registrationHistroy
            .slice(cachedValue.registryVersion)
            .reduce((acc, nameSet) => [...acc, ...nameSet.keys()], [] as string[]),
        );
        let affectd = false;
        const referencedFragmentNames = new Set<string>();
        visit(docNode, {
          FragmentSpread: node => {
            affectd ||= changed.has(node.name.value);
            referencedFragmentNames.add(node.name.value);
          },
        });
        if (!affectd && compareSet(referencedFragmentNames, new Set(cachedValue.referencedFragmentNames))) {
          this._logger('getExternalFragments: use cached value');
          return cachedValue.externalFragments;
        }
      }
    }
    // const map = new Map(
    //   [...this._fragmentsMap.values()]
    //     .flat()
    //     .filter(({ name }) => !names.includes(name))
    //     .map(({ name, node }) => [name, node]),
    // );
    const map = new Map([...this.getUniqueDefinitions(names).validDefinitions.entries()].map(([k, v]) => [k, v.node]));
    const externalFragments = getFragmentDependenciesForAST(docNode, map);
    const referencedFragmentNames: string[] = [];
    visit(docNode, {
      FragmentSpread: node => {
        referencedFragmentNames.push(node.name.value);
      },
    });
    this._externalFragmentsCache.set(cacheKey, {
      registryVersion: this._registryVersion,
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
    const definitions: FragmentDefinitionEntry[] = [];
    const previousValues = this._fragmentsMap.get(fileName) ?? [];
    const changedFragmentNames = new Set<string>();
    const previousFragmentNames = new Set(previousValues.map(({ name }) => name));
    const previousValuesMapByDocumentStr = new Map<string, FragmentDefinitionEntry[]>();
    previousValues.forEach(value => {
      const arr = previousValuesMapByDocumentStr.get(value.text);
      if (!arr) {
        previousValuesMapByDocumentStr.set(value.text, [value]);
      } else {
        arr.push(value);
      }
    });
    for (const documentStr of documentStrings) {
      const previous = previousValuesMapByDocumentStr.get(documentStr.text);
      if (previous) {
        previous.forEach(({ name }) => previousFragmentNames.delete(name));
        definitions.push(...previous.map(v => ({ ...v, sourcePosition: documentStr.sourcePosition })));
        continue;
      }
      let docNode: DocumentNode | undefined = undefined;
      try {
        docNode = parse(documentStr.text);
      } catch {}
      if (!docNode) {
        continue;
      }
      const newDefs = getFragmentsInDocument(docNode).map(
        def =>
          ({
            fileName,
            sourcePosition: documentStr.sourcePosition,
            text: documentStr.text,
            name: def.name.value,
            node: def,
          }) satisfies FragmentDefinitionEntry,
      );
      newDefs.forEach(({ name }) => changedFragmentNames.add(name));
      definitions.push(...newDefs);
    }
    const affetctedFragmentNames = new Set([...previousFragmentNames.keys(), ...changedFragmentNames.keys()]);
    this._fileVersionMap.set(fileName, version);
    this._fragmentsMap.set(fileName, definitions);
    if (affetctedFragmentNames.size) {
      this._registrationHistroy[this._registryVersion] = affetctedFragmentNames;
      this._registryVersion++;
    }
  }

  removeDocument(fileName: string): void {
    const previousValues = this._fragmentsMap.get(fileName) ?? [];
    const affetctedFragmentNames = new Set(previousValues.map(({ name }) => name));
    this._fileVersionMap.delete(fileName);
    this._fragmentsMap.delete(fileName);
    if (affetctedFragmentNames.size) {
      this._registrationHistroy[this._registryVersion] = affetctedFragmentNames;
      this._registryVersion++;
    }
  }

  private _getWholeDefinitions() {
    const cached = this._uniqueDefinitionsCache.get('');
    if (cached && cached.registryVersion === this._registryVersion) {
      const { validDefinitions, duplicatedDefinitions } = cached;
      return { validDefinitions, duplicatedDefinitions };
    }
    const map = new Map<string, FragmentDefinitionEntry[]>();
    const duplicatedNames = new Set<string>();
    for (const list of this._fragmentsMap.values()) {
      for (const v of list) {
        const hit = map.get(v.name);
        if (!hit) {
          map.set(v.name, [v]);
        } else {
          hit.push(v);
          duplicatedNames.add(v.name);
        }
      }
    }
    const duplicatedDefinitions = new Map<string, FragmentDefinitionEntry[]>();
    for (const name of duplicatedNames) {
      duplicatedDefinitions.set(name, map.get(name)!);
      map.delete(name);
    }
    const validDefinitions = new Map([...map.entries()].map(([k, v]) => [k, v[0]]));
    const cacheEntry = {
      registryVersion: this._registryVersion,
      validDefinitions,
      duplicatedDefinitions,
    } satisfies UniqueDefinitionsResult;
    this._uniqueDefinitionsCache.set('', cacheEntry);
    return {
      validDefinitions,
      duplicatedDefinitions,
    };
  }
}
