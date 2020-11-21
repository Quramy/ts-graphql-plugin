import ts from 'typescript';

export type TagCondition = string;

export function findNode(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  function find(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart() && position < node.getEnd()) {
      return ts.forEachChild(node, find) || node;
    }
  }
  return find(sourceFile);
}

export function findAllNodes(sourceFile: ts.SourceFile, cond: (n: ts.Node) => boolean): ts.Node[] {
  const result: ts.Node[] = [];
  function find(node: ts.Node) {
    if (cond(node)) {
      result.push(node);
      return;
    } else {
      ts.forEachChild(node, find);
    }
  }
  find(sourceFile);
  return result;
}

export function isTagged(node: ts.Node, condition: TagCondition) {
  if (!node || !node.parent) return false;
  if (!ts.isTaggedTemplateExpression(node.parent)) return false;
  const tagNode = node.parent;
  return tagNode.tag.getText() === condition;
}

export function isTemplateLiteralTypeNode(node: ts.Node): node is ts.TemplateLiteralTypeNode {
  // ts.isNoSubstitutionTemplateLiteral exists TypeScript >= 4.1
  return typeof ts.isTemplateLiteralTypeNode === 'function' && ts.isTemplateLiteralTypeNode(node);
}

export function isImportDeclarationWithCondition(
  node: ts.Node,
  { isDefault, name, from }: { isDefault?: boolean; name?: string; from?: string },
) {
  if (!name && !from) return false;
  if (!ts.isImportDeclaration(node)) return false;
  if (from) {
    if (!ts.isStringLiteralLike(node.moduleSpecifier) || node.moduleSpecifier.text !== from) return false;
  }
  if (!name) return true;
  if (!node.importClause) return false;
  let result = false;
  if (isDefault !== false) {
    result = result || node.importClause.name?.text === name;
  }
  if (isDefault !== true && node.importClause.namedBindings) {
    if (ts.isNamedImports(node.importClause.namedBindings)) {
      result = result || node.importClause.namedBindings.elements.some(elm => elm.name?.text === name);
    } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
      result = result || node.importClause.namedBindings.name?.text === name;
    }
  }
  return result;
}

export function mergeNamedBinding(base: ts.NamedImportBindings | undefined, head: ts.NamedImportBindings | undefined) {
  if (!base && !head) return undefined;
  if (!base) return head;
  if (!head) return base;
  // treat namedImports only
  if (ts.isNamespaceImport(base) || ts.isNamespaceImport(head)) return base;
  return ts.updateNamedImports(base, [...base.elements, ...head.elements]);
}

export function mergeImportClause(base: ts.ImportClause | undefined, head: ts.ImportClause | undefined) {
  if (!base && !head) return undefined;
  if (!base) return head;
  if (!head) return base;
  const name = head.name || base.name;
  const namedBindings = mergeNamedBinding(base.namedBindings, head.namedBindings);
  const isTypeOnly = base.isTypeOnly && head.isTypeOnly;
  return ts.updateImportClause(base, name, namedBindings, isTypeOnly);
}

export function mergeImportDeclarationsWithSameModules(base: ts.ImportDeclaration, head: ts.ImportDeclaration) {
  if (!ts.isStringLiteralLike(base.moduleSpecifier) || !ts.isStringLiteralLike(head.moduleSpecifier)) return base;
  if (base.moduleSpecifier.text !== head.moduleSpecifier.text) return base;
  const decorators = head.decorators || base.decorators;
  const modifiers = head.modifiers || base.modifiers;
  const importClause = mergeImportClause(base.importClause, head.importClause);
  return ts.updateImportDeclaration(base, decorators, modifiers, importClause, base.moduleSpecifier);
}
