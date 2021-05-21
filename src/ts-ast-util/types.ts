import ts from 'typescript';

/**
 *
 * Helper to write TypeScript source file.
 *
 */
export interface OutputSource {
  /**
   *
   * Absolute path of the output file.
   *
   */
  readonly outputFileName: string;

  /**
   *
   * Absolute path of directory of the output file.
   *
   */
  readonly outputDirName: string;

  /**
   *
   * Get all statements in this output source.
   *
   * @returns An array of statement AST node.
   *
   */
  readonly getStatements: () => ReadonlyArray<ts.Statement>;

  /**
   *
   * Add statement to this output source.
   *
   */
  readonly pushStatement: (statement: ts.Statement) => void;

  /**
   *
   * Replace a statement in this output source to specified new statement.
   *
   * @param statement - target statement node to replace.
   * @param newStatement - new statement.
   * @returns True when the statement of the first argument is found. Otherwise false.
   *
   */
  readonly replaceStatement: (statement: ts.Statement, newStatement: ts.Statement) => boolean;

  /**
   *
   * Remove a statement in this output source.
   *
   * @param statement - target statement node to remove.
   * @returns True when the statement is found. Otherwise false.
   *
   */
  readonly removeStatement: (statement: ts.Statement) => boolean;

  /**
   *
   * Add default import statement to this output source.
   *
   * @remarks
   * This method does nothing when the output source already has the import
   *
   * @example
   *
   * ```ts
   * outputSource.pushDefaultImportIfNeeded('MyType', './my-module');
   * console.log(ts.createPrinter().print(outputSource.toSourceFile())); // -> 'import MyType from "./my-module";'
   * ```
   *
   * @param identifierName - the identifier name to import.
   * @param from - the module name specifier to import from.
   * @returns True if the output source is mutated by this operation.
   *
   */
  readonly pushDefaultImportIfNeeded: (identifierName: string, from: string) => boolean;

  /**
   *
   * Add named import statement to the output source.
   *
   * @remarks
   * This method does nothing when the output source already has the same import statement.
   *
   * @example
   *
   * ```ts
   * outputSource.pushDefaultImportIfNeeded('MyType', './my-module');
   * console.log(ts.createPrinter().print(outputSource.toSourceFile())); // -> 'import { MyType } from "./my-module";'
   * ```
   *
   * @param identifierName - the identifier name to import.
   * @param from - the module name specifier to import from.
   * @returns True if the output source is mutated by this operation.
   *
   */
  readonly pushNamedImportIfNeeded: (identifierName: string, from: string) => boolean;

  /**
   *
   * Write comment to the top of this output source.
   *
   */
  readonly writeLeadingComment: (comment: string) => void;

  /**
   *
   * Create TypeScript SourceFile object from this output source.
   *
   */
  readonly toSourceFile: () => ts.SourceFile;
}

export type ComputePosition = (innerPosition: number) => {
  fileName: string;
  pos: number;
  isInOtherExpression?: boolean;
};

/**
 *
 * Serves the following information.
 *
 * - interpolated string
 * - position converting functions between TS source and GraphQL document
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
