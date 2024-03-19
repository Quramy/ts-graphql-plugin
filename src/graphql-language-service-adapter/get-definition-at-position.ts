import type { AnalysisContext, GetDefinitionAtPosition } from './types';
import { getDefinitionAndBoundSpan } from './get-definition-and-bound-span';

export function getDefinitionAtPosition(
  ctx: AnalysisContext,
  delegate: GetDefinitionAtPosition,
  fileName: string,
  position: number,
) {
  const result = getDefinitionAndBoundSpan(ctx, () => undefined, fileName, position);
  if (!result) return delegate(fileName, position);
  return result.definitions;
}
