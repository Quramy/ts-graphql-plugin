import { parse, type DocumentNode, FragmentDefinitionNode } from 'graphql';
import { getFragmentsInDocument } from './utility-functions';

export class FragmentRegistry {
  private _fileVersionMap = new Map<string, string>();
  private _fragmentsMap = new Map<string, FragmentDefinitionNode[]>();

  getFileCurrentVersion(fileName: string): string | undefined {
    return this._fileVersionMap.get(fileName);
  }

  getFragmentDefinitions(fragmentNamesToBeIgnored: string[] = []): FragmentDefinitionNode[] {
    return [...this._fragmentsMap.values()].flat().filter(def => !fragmentNamesToBeIgnored.includes(def.name.value));
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
