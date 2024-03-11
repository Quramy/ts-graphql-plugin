import { parse, type DocumentNode, FragmentDefinitionNode } from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import { getFragmentsInDocument, getFragmentNamesInDocument } from './utility-functions';

type FileName = string;
type FileVersion = string;

export class FragmentRegistry {
  private _fileVersionMap = new Map<FileName, FileVersion>();
  private _fragmentsMap = new Map<FileName, FragmentDefinitionNode[]>();

  getFileCurrentVersion(fileName: string): string | undefined {
    return this._fileVersionMap.get(fileName);
  }

  getFragmentDefinitions(fragmentNamesToBeIgnored: string[] = []): FragmentDefinitionNode[] {
    return [...this._fragmentsMap.values()].flat().filter(def => !fragmentNamesToBeIgnored.includes(def.name.value));
  }

  getExternalFragments(documentStr: string): FragmentDefinitionNode[] {
    let docNode: DocumentNode | undefined = undefined;
    try {
      docNode = parse(documentStr);
    } catch {
      // Nothing to do
    }
    if (!docNode) return [];
    const names = getFragmentNamesInDocument(docNode);
    const map = new Map(
      [...this._fragmentsMap.values()]
        .flat()
        .filter(def => !names.includes(def.name.value))
        .map(def => [def.name.value, def]),
    );
    return getFragmentDependenciesForAST(docNode, map);
  }

  registerDocument(fileName: string, version: string, documentStrings: string[]): void {
    const definitions: FragmentDefinitionNode[] = [];
    for (const document of documentStrings) {
      let docNode: DocumentNode | undefined = undefined;
      this._fileVersionMap.set(fileName, version);
      try {
        docNode = parse(document);
      } catch {}
      if (!docNode) {
        continue;
      }
      definitions.push(...getFragmentsInDocument(docNode));
    }
    this._fragmentsMap.set(fileName, definitions);
  }

  removeDocument(fileName: string): void {
    this._fileVersionMap.delete(fileName);
    this._fragmentsMap.delete(fileName);
  }
}
