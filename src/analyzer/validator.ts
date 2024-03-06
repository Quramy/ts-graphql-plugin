import { GraphQLSchema } from 'graphql';
import { getDiagnostics } from 'graphql-language-service';
import { ExtractResult } from './extractor';
import { ErrorWithLocation } from '../errors';
import { getFragmentsInDocument, getFragmentNamesInDocument } from '../gql-ast-util';

export function validate(extractedResults: ExtractResult[], schema: GraphQLSchema) {
  const errors: ErrorWithLocation[] = [];
  const globalFragmentDefinitions = getFragmentsInDocument(...extractedResults.map(({ documentNode }) => documentNode));
  extractedResults.forEach(r => {
    if (!r.resolevedTemplateInfo) return;
    const { combinedText, getSourcePosition, convertInnerLocation2InnerPosition } = r.resolevedTemplateInfo;
    const fragmentNamesInText = getFragmentNamesInDocument(r.documentNode);
    const diagnostics = getDiagnostics(
      combinedText,
      schema,
      undefined,
      undefined,
      globalFragmentDefinitions.filter(def => !fragmentNamesInText.includes(def.name.value)),
    );
    diagnostics.forEach(diagnositc => {
      const { pos: startPositionOfSource, isInOtherExpression } = getSourcePosition(
        convertInnerLocation2InnerPosition(diagnositc.range.start),
      );
      if (isInOtherExpression) return;
      let endPositionOfSource: number = 0;
      try {
        endPositionOfSource = getSourcePosition(convertInnerLocation2InnerPosition(diagnositc.range.end)).pos;
      } catch (error) {
        endPositionOfSource = startPositionOfSource + 1;
      }
      errors.push(
        new ErrorWithLocation(diagnositc.message, {
          fileName: r.fileName,
          severity: diagnositc.severity === 2 ? 'Warn' : 'Error',
          content: r.templateNode.getSourceFile().getText(),
          start: startPositionOfSource,
          end: endPositionOfSource,
        }),
      );
    });
  });
  return errors;
}
