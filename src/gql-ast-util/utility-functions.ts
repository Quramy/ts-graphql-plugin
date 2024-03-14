import { DocumentNode, FragmentDefinitionNode } from 'graphql';

export function getFragmentsInDocument(...documentNodes: (DocumentNode | undefined)[]) {
  const fragmentDefs = new Map<string, FragmentDefinitionNode>();
  for (const documentNode of documentNodes) {
    if (!documentNode) return [];
    for (const def of documentNode.definitions) {
      if (def.kind === 'FragmentDefinition') {
        fragmentDefs.set(def.name.value, def);
      }
    }
  }
  return [...fragmentDefs.values()];
}

export function getFragmentNamesInDocument(...documentNodes: (DocumentNode | undefined)[]) {
  const nameSet = new Set<string>();
  for (const documentNode of documentNodes) {
    if (!documentNode) return [];
    for (const def of documentNode.definitions) {
      if (def.kind === 'FragmentDefinition') {
        nameSet.add(def.name.value);
      }
    }
  }
  return [...nameSet];
}

export function cloneFragmentMap(from: Map<string, FragmentDefinitionNode>, namesToBeExcluded: string[] = []) {
  const map = new Map(from);
  for (const name in namesToBeExcluded) {
    map.delete(name);
  }
  return map;
}

export function detectDuplicatedFragments(documentNode: DocumentNode) {
  const fragments: FragmentDefinitionNode[] = [];
  const duplicatedFragments: FragmentDefinitionNode[] = [];
  documentNode.definitions.forEach(def => {
    if (def.kind === 'FragmentDefinition') {
      if (fragments.some(f => f.name.value === def.name.value)) {
        duplicatedFragments.push(def);
      } else {
        fragments.push(def);
      }
    }
  });
  return duplicatedFragments
    .map(def => {
      return {
        name: def.name.value,
        start: def.loc!.start,
        end: def.loc!.end,
      };
    })
    .sort((a, b) => b.start - a.start);
}
