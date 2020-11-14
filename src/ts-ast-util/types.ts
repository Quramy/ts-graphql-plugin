import ts from 'typescript';
import type { ResolvedTemplateInfo, ResolveResult } from '.';

export interface ScriptSourceHelper {
  getAllNodes: (fileName: string, condition: (n: ts.Node) => boolean) => ts.Node[];
  getNode: (fileName: string, position: number) => ts.Node | undefined;
  getLineAndChar: (fileName: string, position: number) => ts.LineAndCharacter;
  resolveTemplateLiteral: (
    fileName: string,
    node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression,
  ) => ResolveResult;
  updateTemplateLiteralInfo: (
    target: ResolvedTemplateInfo,
    range: { start: number; end: number },
    text?: string,
  ) => ResolvedTemplateInfo;
}

export interface SourceWriteHelper {
  readonly outputFileName: string;
  readonly getStatements: () => ReadonlyArray<ts.Statement>;
  readonly pushImportDeclaration: (importDeclaration: ts.ImportDeclaration) => void;
  readonly pushStatement: (statement: ts.Statement) => void;
  readonly writeLeadingComment: (comment: string) => void;
  readonly toSourceFile: () => ts.SourceFile;
}
