import path from 'path';
import ts from 'typescript';

import { OutputSource } from './types';
import {
  createImportSpecifier,
  isImportDeclarationWithCondition,
  mergeImportDeclarationsWithSameModules,
} from './utilily-functions';

const printer = ts.createPrinter();

/**
 *
 * @internal
 *
 */
export class DefaultOutputSource implements OutputSource {
  private _unmergedComment: string[] = [];
  private _statements: ts.Statement[] = [];

  constructor(private _filename: string) {}

  get outputFileName() {
    return this._filename;
  }

  get outputDirName() {
    return path.dirname(this._filename);
  }

  findImportDeclarationIndex({ isDefault, name, from }: { isDefault?: boolean; name?: string; from?: string }) {
    return this._statements.findIndex(st => isImportDeclarationWithCondition(st, { isDefault, name, from }));
  }

  pushNamedImportIfNeeded(identifierName: string, from: string) {
    if (this.findImportDeclarationIndex({ name: identifierName, from }) !== -1) return false;
    const importSpecifier = createImportSpecifier(false, undefined, ts.createIdentifier(identifierName));
    const namedBinding = ts.createNamedImports([importSpecifier]);
    const importClause = ts.createImportClause(undefined, namedBinding);
    const moduleSpecifier = ts.createStringLiteral(from);
    const importDeclaration = ts.createImportDeclaration(undefined, undefined, importClause, moduleSpecifier);
    const indexOfSameModuleImport = this.findImportDeclarationIndex({ from });
    if (indexOfSameModuleImport === -1) {
      this.pushImportDeclaration(importDeclaration);
    } else {
      const base = this.getStatements()[indexOfSameModuleImport] as ts.ImportDeclaration;
      const merged = mergeImportDeclarationsWithSameModules(base, importDeclaration);
      this._replaceStatement(indexOfSameModuleImport, merged);
    }
    return true;
  }

  pushDefaultImportIfNeeded(identifierName: string, from: string) {
    if (this.findImportDeclarationIndex({ name: identifierName, from, isDefault: true }) !== -1) return false;
    const importClause = ts.createImportClause(ts.createIdentifier(identifierName), undefined);
    const moduleSpecifier = ts.createStringLiteral(from);
    const importDeclaration = ts.createImportDeclaration(undefined, undefined, importClause, moduleSpecifier);
    const indexOfSameModuleImport = this.findImportDeclarationIndex({ from });
    if (indexOfSameModuleImport === -1) {
      this.pushImportDeclaration(importDeclaration);
    } else {
      const base = this.getStatements()[indexOfSameModuleImport] as ts.ImportDeclaration;
      const merged = mergeImportDeclarationsWithSameModules(base, importDeclaration);
      this._replaceStatement(indexOfSameModuleImport, merged);
    }
    return true;
  }

  pushImportDeclaration(declaration: ts.ImportDeclaration) {
    for (let i = 0; i < this._statements.length; i++) {
      if (!ts.isImportDeclaration(this._statements[i])) {
        this._insertStatement(i, declaration);
        return;
      }
    }
    this._insertStatement(0, declaration);
  }

  pushStatement(statement: ts.Statement) {
    this._insertStatement(this._statements.length, statement);
  }

  replaceStatement(statement: ts.Statement, newStatement: ts.Statement) {
    const idx = this._findIndex(statement);
    if (idx === -1) return false;
    this._replaceStatement(idx, newStatement);
    return true;
  }

  removeStatement(statement: ts.Statement) {
    const idx = this._findIndex(statement);
    if (idx === -1) return false;
    this._statements = [...this._statements.slice(0, idx), ...this._statements.slice(idx + 1)];
    return true;
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

  private _findIndex(statement: ts.Statement) {
    return this._statements.findIndex(st => st === statement);
  }

  private _insertStatement(index: number, statement: ts.Statement) {
    this._statements = [...this._statements.slice(0, index), statement, ...this._statements.slice(index)];
    if (this._unmergedComment.length) {
      this._unmergedComment.forEach(comment => this.writeLeadingComment(comment));
      this._unmergedComment = [];
    }
  }

  private _replaceStatement(index: number, statement: ts.Statement) {
    if (!this._statements[index]) return;
    this._statements[index] = statement;
  }
}

export function createOutputSource({ outputFileName }: { outputFileName: string }) {
  return new DefaultOutputSource(outputFileName);
}
