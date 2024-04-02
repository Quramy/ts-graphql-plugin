import type { FragmentDefinitionNode } from 'graphql';
import { getDiagnostics, type Diagnostic } from 'graphql-language-service';

import ts from '../tsmodule';

import { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { ERROR_CODES } from '../errors';
import type { AnalysisContext, GetSemanticDiagnostics } from './types';
import { getSanitizedTemplateText } from '../ts-ast-util';
import { getFragmentsInDocument } from '../gql-ast-util';
import { OutOfRangeError } from '../string-util';

function createSchemaErrorDiagnostic(
  errorInfo: SchemaBuildErrorInfo,
  file: ts.SourceFile,
  start: number,
  length: number,
): ts.Diagnostic {
  let messageText = `[ts-graphql-plugin] Schema build error: '${errorInfo.message}' `;
  if (errorInfo.fileName) {
    messageText += `Check ${errorInfo.fileName}`;
    if (errorInfo.locations && errorInfo.locations[0]) {
      messageText += `[${errorInfo.locations[0].line + 1}:${errorInfo.locations[0].character + 1}]`;
    }
  }
  const category = ts.DiagnosticCategory.Error;
  const code = ERROR_CODES.schemaBuildError.code;
  return { category, code, messageText, file, start, length };
}

function createDuplicatedFragmentDefinitonsDiagnostic(
  file: ts.SourceFile,
  sourcePosition: number,
  defNode: FragmentDefinitionNode,
): ts.Diagnostic {
  const startInner = defNode.name.loc?.start ?? 0;
  const length = defNode.name.loc?.end ? defNode.name.loc.end - startInner : 0;
  return {
    category: ts.DiagnosticCategory.Error,
    file,
    start: sourcePosition + startInner,
    length,
    messageText: ERROR_CODES.duplicatedFragmentDefinitions.message,
    code: ERROR_CODES.duplicatedFragmentDefinitions.code,
  };
}

function createIsInOtherExpressionDiagnostic(file: ts.SourceFile, start: number, length: number) {
  const category = ts.DiagnosticCategory.Error;
  const code = ERROR_CODES.errorInOtherInterpolation.code;
  const messageText = ERROR_CODES.errorInOtherInterpolation.message;
  return { category, code, messageText, file, start, length };
}

function translateDiagnostic(d: Diagnostic, file: ts.SourceFile, start: number, length: number): ts.Diagnostic {
  const category = d.severity === 2 ? ts.DiagnosticCategory.Warning : ts.DiagnosticCategory.Error;
  const code = ERROR_CODES.graphqlLangServiceError.code;
  const messageText = d.message.split('\n')[0];
  return { code, messageText, category, file, start, length };
}

export function getSemanticDiagnostics(ctx: AnalysisContext, delegate: GetSemanticDiagnostics, fileName: string) {
  const errors = delegate(fileName) || [];
  if (ctx.getScriptSourceHelper().isExcluded(fileName)) return errors;
  const nodes = ctx.findTemplateNodes(fileName);
  const result = [...errors];
  const [schema, schemaErrors] = ctx.getSchemaOrSchemaErrors();
  if (schemaErrors) {
    nodes.forEach(node => {
      schemaErrors.forEach(schemaErrorInfo => {
        const file = node.getSourceFile();
        const start = node.getStart();
        const lengrh = node.getWidth();
        result.push(createSchemaErrorDiagnostic(schemaErrorInfo, file, start, lengrh));
      });
    });
  } else if (schema) {
    const diagnosticsAndResolvedInfoList = nodes.map(n => {
      const { text, sourcePosition } = getSanitizedTemplateText(n);
      result.push(
        ...getFragmentsInDocument(ctx.getGraphQLDocumentNode(text))
          .filter(fragmentDef => ctx.getDuplicaterdFragmentDefinitions().has(fragmentDef.name.value))
          .map(fragmentDef =>
            createDuplicatedFragmentDefinitonsDiagnostic(n.getSourceFile(), sourcePosition, fragmentDef),
          ),
      );
      const { resolvedInfo, resolveErrors } = ctx.resolveTemplateInfo(fileName, n);
      const externalFragments = resolvedInfo
        ? ctx.getExternalFragmentDefinitions(resolvedInfo.combinedText, fileName, resolvedInfo.getSourcePosition(0).pos)
        : [];
      return {
        resolveErrors,
        resolvedTemplateInfo: resolvedInfo,
        diagnostics: resolvedInfo
          ? getDiagnostics(resolvedInfo.combinedText, schema, undefined, undefined, externalFragments)
          : [],
      };
    });
    diagnosticsAndResolvedInfoList.forEach((info, i) => {
      const node = nodes[i];
      if (!info.resolvedTemplateInfo) {
        info.resolveErrors
          .filter(re => re.fileName === fileName)
          .forEach(resolveError => {
            result.push({
              category: ts.DiagnosticCategory.Warning,
              code: ERROR_CODES.templateIsTooComplex.code,
              messageText: ERROR_CODES.templateIsTooComplex.message,
              file: node.getSourceFile(),
              start: resolveError.start,
              length: resolveError.end,
            });
          });
        return;
      }
      const {
        diagnostics,
        resolvedTemplateInfo: { getSourcePosition, convertInnerLocation2InnerPosition },
      } = info;
      diagnostics.forEach(d => {
        let length = 0;
        const file = node.getSourceFile();
        try {
          const { pos: startPositionOfSource, isInOtherExpression } = getSourcePosition(
            convertInnerLocation2InnerPosition(d.range.start, true),
          );
          try {
            const endPositionOfSource = getSourcePosition(convertInnerLocation2InnerPosition(d.range.end, true)).pos;
            length = endPositionOfSource - startPositionOfSource - 1;
          } catch (error) {
            length = 0;
          }
          if (isInOtherExpression) {
            result.push(createIsInOtherExpressionDiagnostic(file, startPositionOfSource, length));
          } else {
            result.push(translateDiagnostic(d, file, startPositionOfSource, length));
          }
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
  }
  return result;
}
