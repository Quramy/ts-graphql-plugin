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
