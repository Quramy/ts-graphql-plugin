import ts from 'typescript';
import { CompletionItem } from 'graphql-language-service-types';
import { getAutocompleteSuggestions } from 'graphql-language-service-interface';
import { AnalysisContext, GetCompletionAtPosition } from './types';
import { SimplePosition } from './simple-position';

function translateCompletionItems(items: CompletionItem[]): ts.CompletionInfo {
  const result: ts.CompletionInfo = {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: items.map(r => {
      // FIXME use ts.ScriptElementKind
      const kind = r.kind ? r.kind + '' : ('unknown' as any);
      return {
        name: r.label,
        kindModifiers: 'declare',
        kind,
        sortText: '0',
      };
    }),
  };
  return result;
}

export function getCompletionAtPosition(
  ctx: AnalysisContext,
  delegate: GetCompletionAtPosition,
  fileName: string,
  position: number,
  options: ts.GetCompletionsAtPositionOptions | undefined,
  formattingSettings?: ts.FormatCodeSettings | undefined,
) {
  const schema = ctx.getSchema();
  if (!schema) return delegate(fileName, position, options);
  const node = ctx.findTemplateNode(fileName, position);
  if (!node) return delegate(fileName, position, options);
  const { resolvedInfo } = ctx.resolveTemplateInfo(fileName, node);
  if (!resolvedInfo) {
    return delegate(fileName, position, options, formattingSettings);
  }
  const { combinedText, getInnerPosition, convertInnerPosition2InnerLocation } = resolvedInfo;
  // NOTE: The getAutocompleteSuggestions function does not return if missing '+1' shift
  const innerPositionToSearch = getInnerPosition(position).pos + 1;
  const innerLocation = convertInnerPosition2InnerLocation(innerPositionToSearch);
  ctx.debug(
    'Get GraphQL complete suggestions. documentText: "' + combinedText + '", position: ' + innerPositionToSearch,
  );
  const positionForSeach = new SimplePosition({
    line: innerLocation.line,
    character: innerLocation.character,
  });
  const gqlCompletionItems = getAutocompleteSuggestions(schema, combinedText, positionForSeach);
  ctx.debug(JSON.stringify(gqlCompletionItems));
  return translateCompletionItems(gqlCompletionItems);
}
