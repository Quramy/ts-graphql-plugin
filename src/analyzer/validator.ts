import { GraphQLSchema } from 'graphql';
import { getDiagnostics, getFragmentDependenciesForAST } from 'graphql-language-service';
import { ErrorWithLocation, ERROR_CODES } from '../errors';
import { ComputePosition } from '../ts-ast-util';
import { getFragmentsInDocument, getFragmentNamesInDocument, cloneFragmentMap } from '../gql-ast-util';
import { ExtractResult } from './extractor';
import { OutOfRangeError } from '../string-util';

function calcEndPositionSafely(
  startPositionOfSource: number,
  getSourcePosition: ComputePosition,
  innerPosition: number,
) {
  let endPositionOfSource: number = 0;
  try {
    endPositionOfSource = getSourcePosition(innerPosition).pos;
  } catch (error) {
    endPositionOfSource = startPositionOfSource + 1;
  }
  return endPositionOfSource;
}

export function validate({ fileEntries: extractedResults, globalFragments }: ExtractResult, schema: GraphQLSchema) {
  const errors: ErrorWithLocation[] = [];
  extractedResults.forEach(r => {
    if (!r.resolevedTemplateInfo) return;
    const { combinedText, getSourcePosition, convertInnerLocation2InnerPosition } = r.resolevedTemplateInfo;
    const fragmentNamesInText = getFragmentNamesInDocument(r.documentNode);
    errors.push(
      ...getFragmentsInDocument(r.documentNode)
        .map(fragmentDef => [fragmentDef, getSourcePosition(fragmentDef.name.loc!.start)] as const)
        .filter(
          ([fragmentDef, { isInOtherExpression }]) =>
            !isInOtherExpression && globalFragments.duplicatedDefinitions.has(fragmentDef.name.value),
        )
        .map(
          ([fragmentDef, { pos: startPositionOfSource }]) =>
            new ErrorWithLocation(ERROR_CODES.duplicatedFragmentDefinitions.message, {
              fileName: r.fileName,
              severity: 'Error',
              content: r.templateNode.getSourceFile().getText(),
              start: startPositionOfSource,
              end: calcEndPositionSafely(startPositionOfSource, getSourcePosition, fragmentDef.name.loc!.end),
            }),
        ),
    );
    const externalFragments = r.documentNode
      ? getFragmentDependenciesForAST(
          r.documentNode,
          cloneFragmentMap(globalFragments.definitionMap, fragmentNamesInText),
        )
      : [];
    const diagnostics = getDiagnostics(combinedText, schema, undefined, undefined, externalFragments);
    diagnostics.forEach(diagnositc => {
      try {
        const { pos: startPositionOfSource, isInOtherExpression } = getSourcePosition(
          convertInnerLocation2InnerPosition(diagnositc.range.start, true),
        );
        if (isInOtherExpression) return;
        const endPositionOfSource = calcEndPositionSafely(
          startPositionOfSource,
          getSourcePosition,
          convertInnerLocation2InnerPosition(diagnositc.range.end),
        );
        errors.push(
          new ErrorWithLocation(diagnositc.message, {
            fileName: r.fileName,
            severity: diagnositc.severity === 2 ? 'Warn' : 'Error',
            content: r.templateNode.getSourceFile().getText(),
            start: startPositionOfSource,
            end: endPositionOfSource,
          }),
        );
      } catch (e) {
        if (e instanceof OutOfRangeError) {
          // Note:
          // We can not convertInnerLocation2InnerPosition if semantics diagnostics are located in externalFragments.
          // In other words, there is no error in the original sanitized template text, so nothing to do.
          return;
        }
        throw e;
      }
    });
  });
  return errors;
}
