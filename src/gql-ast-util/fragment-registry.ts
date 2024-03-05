import { parse, type DocumentNode, FragmentDefinitionNode } from 'graphql';

type FragmentRegistryEntry = {
  readonly fileName: string;
  readonly fragmentDefinition: FragmentDefinitionNode;
};

export class FragmentRegistry {
  private _map = new Map<string, FragmentRegistryEntry>();

  getFragmentDefinitions() {
    return [...this._map.values()].map(node => node.fragmentDefinition);
  }

  getFragmentDependencies() {
    const map = new Map<string, FragmentDefinitionNode>();
    for (const [k, v] of this._map.entries()) {
      map.set(k, v.fragmentDefinition);
    }
    return map;
  }

  registerDocument(fileName: string, document: string) {
    let docNode: DocumentNode | undefined = undefined;
    try {
      docNode = parse(document);
    } catch {}
    if (!docNode) return;
    docNode.definitions.forEach(node => {
      if (node.kind !== 'FragmentDefinition') return;
      this._map.set(node.name.value, {
        fileName,
        fragmentDefinition: node,
      });
    });
  }
}
