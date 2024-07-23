import { getHoverInformation } from 'graphql-language-service';

import ts from '../tsmodule';
import type { AnalysisContext, GetQuickInfoAtPosition } from './types';
import { SimplePosition } from './simple-position';

export function getQuickInfoAtPosition(
  ctx: AnalysisContext,
  delegate: GetQuickInfoAtPosition,
  fileName: string,
  position: number,
) {
  if (ctx.getScriptSourceHelper().isExcluded(fileName)) return delegate(fileName, position);
  const schema = ctx.getSchema();
  if (!schema) return delegate(fileName, position);
  const node = ctx.findAscendantTemplateNode(fileName, position);
  if (!node) return delegate(fileName, position);
  const { resolvedInfo } = ctx.resolveTemplateInfo(fileName, node);
  if (!resolvedInfo) return delegate(fileName, position);
  const { combinedText, getInnerPosition, convertInnerPosition2InnerLocation } = resolvedInfo;
  const cursor = new SimplePosition(convertInnerPosition2InnerLocation(getInnerPosition(position).pos + 1));
  const result = getHoverInformation(schema, combinedText, cursor);
  if (typeof result !== 'string' || !result.length) return delegate(fileName, position);
  return {
    kind: ts.ScriptElementKind.string,
    textSpan: {
      start: position,
      length: 1,
    },
    kindModifiers: '',
    displayParts: [{ text: result, kind: '' }],
  } as ts.QuickInfo;
}
