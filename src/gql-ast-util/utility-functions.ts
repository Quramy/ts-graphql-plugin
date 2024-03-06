import { DocumentNode, FragmentDefinitionNode } from 'graphql';

export function getFragmentsInDocument(documentNode: DocumentNode | undefined) {
  if (!documentNode) return [];
  const fragmentDefs = new Set<FragmentDefinitionNode>();
  for (const def of documentNode.definitions) {
    if (def.kind === 'FragmentDefinition') {
      fragmentDefs.add(def);
    }
  }
  return [...fragmentDefs];
}

export function getFragmentNamesInDocument(documentNode: DocumentNode | undefined) {
  if (!documentNode) return [];
  const nameSet = new Set<string>();
  for (const def of documentNode.definitions) {
    if (def.kind === 'FragmentDefinition') {
      nameSet.add(def.name.value);
    }
  }
  return [...nameSet];
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
