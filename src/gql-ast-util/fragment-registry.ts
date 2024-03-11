import { parse, type DocumentNode, FragmentDefinitionNode, visit } from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import { LRUCache } from '../cache';
import { getFragmentsInDocument, getFragmentNamesInDocument } from './utility-functions';

type FileName = string;
type FileVersion = string;

type ExternalFragmentsCacheEntry = {
  registryVersion: number;
  externalFragments: FragmentDefinitionNode[];
  referencedFragmentNames: string[];
};

type FragmentsMapEntry = {
  text: string;
  name: string;
  node: FragmentDefinitionNode;
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
  private _fragmentsMap = new Map<FileName, FragmentsMapEntry[]>();
  private _externalFragmentsCache = new LRUCache<string, ExternalFragmentsCacheEntry>(200);
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

  getExternalFragments(documentStr: string, fileName: string, sourcePosition: number): FragmentDefinitionNode[] {
    let docNode: DocumentNode | undefined = undefined;
    try {
      docNode = parse(documentStr);
    } catch {
      // Nothing to do
    }
    if (!docNode) return [];
    const cacheKey = `${fileName}:${sourcePosition}`;
    const cachedValue = this._externalFragmentsCache.get(cacheKey);
    if (cachedValue) {
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
    const names = getFragmentNamesInDocument(docNode);
    const map = new Map(
      [...this._fragmentsMap.values()]
        .flat()
        .filter(({ name }) => !names.includes(name))
        .map(({ name, node }) => [name, node]),
    );
    const externalFragments = getFragmentDependenciesForAST(docNode, map);
    const referencedFragmentNames: string[] = [];
    visit(docNode, {
      FragmentSpread: node => {
        referencedFragmentNames.push(node.name.value);
      },
    });
    this._externalFragmentsCache.set(cacheKey, {
      registryVersion: this._registryVersion,
      externalFragments,
      referencedFragmentNames,
    });
    return externalFragments;
  }

  registerDocument(fileName: string, version: string, documentStrings: string[]): void {
    const definitions: FragmentsMapEntry[] = [];
    const previousValues = this._fragmentsMap.get(fileName) ?? [];
    const changedFragmentNames = new Set<string>();
    const previousFragmentNames = new Set(previousValues.map(({ name }) => name));
    const previousValuesMapByDocumentStr = new Map<string, FragmentsMapEntry[]>();
    previousValues.forEach(value => {
      const arr = previousValuesMapByDocumentStr.get(value.text);
      if (!arr) {
        previousValuesMapByDocumentStr.set(value.text, [value]);
      } else {
        arr.push(value);
      }
    });
    for (const documentStr of documentStrings) {
      const previous = previousValuesMapByDocumentStr.get(documentStr);
      if (previous) {
        previous.forEach(({ name }) => previousFragmentNames.delete(name));
        definitions.push(...previous);
        continue;
      }
      let docNode: DocumentNode | undefined = undefined;
      try {
        docNode = parse(documentStr);
      } catch {}
      if (!docNode) {
        continue;
      }
      const newDefs = getFragmentsInDocument(docNode).map(
        def =>
          ({
            text: documentStr,
            name: def.name.value,
            node: def,
          }) satisfies FragmentsMapEntry,
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
}
