import ts from 'typescript';

import { SourceWriteHelper } from './types';

const printer = ts.createPrinter();

/**
 *
 * @internal
 *
 */
export class Helper implements SourceWriteHelper {
  private _unmergedComment: string[] = [];
  private _statements: ts.Statement[] = [];

  constructor(private _filename: string) {}

  get outputFileName() {
    return this._filename;
  }

  pushImportDeclaration(declaration: ts.ImportDeclaration) {
    let i = this._statements.length - 1;
    for (; i >= 0; i--) {
      if (ts.isImportDeclaration(this._statements[i])) {
        break;
      }
    }
    this._insertStatement(declaration, i);
  }

  pushStatement(statement: ts.Statement) {
    this._insertStatement(statement, this._statements.length);
  }

  writeLeadingComment(comment: string) {
    if (this._statements.length > 0) {
      ts.addSyntheticLeadingComment(this._statements[0], ts.SyntaxKind.MultiLineCommentTrivia, ` ${comment} `, true);
    } else {
      this._unmergedComment.push(comment);
    }
  }

  getStatements() {
    return this._statements as ReadonlyArray<ts.Statement>;
  }

  toSourceFile() {
    const sourceFile = ts.createSourceFile(this._filename, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    return ts.updateSourceFileNode(sourceFile, this._statements);
  }

  toFileContent() {
    const content = printer.printFile(this.toSourceFile());
    return { fileName: this._filename, content };
  }

  private _insertStatement(statement: ts.Statement, index: number) {
    this._statements = [...this._statements.slice(0, index), statement, ...this._statements.slice(index)];
    if (this._unmergedComment.length) {
      this._unmergedComment.forEach(comment => this.writeLeadingComment(comment));
      this._unmergedComment = [];
    }
  }
}

export function createSourceWriteHelper({ outputFileName }: { outputFileName: string }) {
  return new Helper(outputFileName);
}
