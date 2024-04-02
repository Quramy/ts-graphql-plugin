import { visit, type FragmentSpreadNode } from 'graphql';
import ts from '../tsmodule';
import { getSanitizedTemplateText } from '../ts-ast-util';
import type { AnalysisContext, GetDefinitionAndBoundSpan } from './types';

export function getDefinitionAndBoundSpan(
  ctx: AnalysisContext,
  delegate: GetDefinitionAndBoundSpan,
  fileName: string,
  position: number,
) {
  if (ctx.getScriptSourceHelper().isExcluded(fileName)) return delegate(fileName, position);
  const node = ctx.findAscendantTemplateNode(fileName, position);
  if (!node) return delegate(fileName, position);
  const { text, sourcePosition } = getSanitizedTemplateText(node);
  const documentNode = ctx.getGraphQLDocumentNode(text);
  if (!documentNode) return delegate(fileName, position);
  const innerPosition = position - sourcePosition;
  let fragmentSpreadNodeUnderCursor: FragmentSpreadNode | undefined;
  visit(documentNode, {
    FragmentSpread: node => {
      if (node.name.loc!.start <= innerPosition && innerPosition < node.name.loc!.end) {
        fragmentSpreadNodeUnderCursor = node;
      }
    },
  });
  if (!fragmentSpreadNodeUnderCursor) return delegate(fileName, position);
  const foundDefinitionDetail = ctx.getGlobalFragmentDefinitionEntry(fragmentSpreadNodeUnderCursor.name.value);
  if (!foundDefinitionDetail) return delegate(fileName, position);
  const definitionSourcePosition = foundDefinitionDetail.position + foundDefinitionDetail.node.name.loc!.start;
  return {
    textSpan: {
      start: sourcePosition + fragmentSpreadNodeUnderCursor.name.loc!.start,
      length: fragmentSpreadNodeUnderCursor.name.loc!.end - fragmentSpreadNodeUnderCursor.name.loc!.start,
    },
    definitions: [
      {
        fileName: foundDefinitionDetail.fileName,
        name: foundDefinitionDetail.node.name.value,
        textSpan: {
          start: definitionSourcePosition,
          length: foundDefinitionDetail.node.name.loc!.end - foundDefinitionDetail.node.name.loc!.start,
        },
        kind: ts.ScriptElementKind.unknown,
        containerKind: ts.ScriptElementKind.unknown,
        containerName: '',
      },
    ],
  } satisfies ts.DefinitionInfoAndBoundSpan;
}
