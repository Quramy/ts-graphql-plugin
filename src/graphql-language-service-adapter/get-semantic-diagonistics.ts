import ts from 'typescript';
import { Diagnostic } from 'graphql-language-service-types';
import { getDiagnostics } from 'graphql-language-service-interface';
import { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';
import { ERROR_CODES } from '../errors';
import { AnalysisContext, GetSemanticDiagnostics } from './types';

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
      const { resolvedInfo, resolveErrors } = ctx.resolveTemplateInfo(fileName, n);
      return {
        resolveErrors,
        resolvedTemplateInfo: resolvedInfo,
        diagnostics: resolvedInfo ? getDiagnostics(resolvedInfo.combinedText, schema) : [],
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
        const { pos: startPositionOfSource, isInOtherExpression } = getSourcePosition(
          convertInnerLocation2InnerPosition(d.range.start),
        );
        try {
          const endPositionOfSource = getSourcePosition(convertInnerLocation2InnerPosition(d.range.end)).pos;
          length = endPositionOfSource - startPositionOfSource - 1;
        } catch (error) {
          length = 0;
        }
        if (isInOtherExpression) {
          result.push(createIsInOtherExpressionDiagnostic(file, startPositionOfSource, length));
        } else {
          result.push(translateDiagnostic(d, file, startPositionOfSource, length));
        }
      });
    });
  }
  return result;
}
