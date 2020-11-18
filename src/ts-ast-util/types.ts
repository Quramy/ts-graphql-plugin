import ts from 'typescript';

export type ComputePosition = (
  innerPosition: number,
) => {
  fileName: string;
  pos: number;
  isInOtherExpression?: boolean;
};

/**
 *
 * Serves the following information.
 *
 * - interpolated string
 * - positon converting functions between TS source and GraphQL document
 *
 **/
export interface ResolvedTemplateInfo {
  combinedText: string;
  getInnerPosition: ComputePosition;
  getSourcePosition: ComputePosition;
  convertInnerPosition2InnerLocation: (pos: number) => { line: number; character: number };
  convertInnerLocation2InnerPosition: (location: { line: number; character: number }) => number;
}

export interface ResolveErrorInfo {
  fileName: string;
  start: number;
  end: number;
}

export interface ResolveResult {
  resolvedInfo?: ResolvedTemplateInfo;
  resolveErrors: ResolveErrorInfo[];
}

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
  readonly outputDirName: string;
  readonly getStatements: () => ReadonlyArray<ts.Statement>;
  readonly pushDefaultImportIfNeeded: (identifierName: string, from: string) => boolean;
  readonly pushNamedImportIfNeeded: (identifierName: string, from: string) => boolean;
  readonly pushStatement: (statement: ts.Statement) => void;
  readonly writeLeadingComment: (comment: string) => void;
  readonly toSourceFile: () => ts.SourceFile;
}
