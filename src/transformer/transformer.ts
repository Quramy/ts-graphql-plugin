import ts from 'typescript';
import { DocumentNode, print } from 'graphql';

export type DocumentTransformer = (documentNode: DocumentNode) => DocumentNode;

export type TransformOptions = {
  tag?: string;
  documentTransformers: DocumentTransformer[];
  removeFragmentDefinitons: boolean;
  target: 'text' | 'object';
  getDocumentNode: (node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression) => DocumentNode | undefined;
};

function toObjectNode(field: any): ts.Expression {
  if (field === null) {
    return ts.createNull();
  } else if (typeof field === 'boolean') {
    return field ? ts.createTrue() : ts.createFalse();
  } else if (typeof field === 'number') {
    return ts.createNumericLiteral(field + '');
  } else if (typeof field === 'string') {
    return ts.createStringLiteral(field);
  } else if (Array.isArray(field)) {
    return ts.createArrayLiteral(field.map(item => toObjectNode(item)));
  }
  return ts.createObjectLiteral(
    Object.entries(field)
      .filter(([k, v]) => k !== 'loc' && v !== undefined)
      .map(([k, v]) => ts.createPropertyAssignment(ts.createIdentifier(k), toObjectNode(v))),
    true,
  );
}

export function getTransformer({
  tag,
  target,
  getDocumentNode,
  removeFragmentDefinitons,
  documentTransformers,
}: TransformOptions) {
  return (ctx: ts.TransformationContext) => {
    let isRemovableImportDeclaration = false;
    const visit = (node: ts.Node): ts.Node | undefined => {
      let templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | undefined = undefined;

      if (ts.isImportDeclaration(node)) {
        isRemovableImportDeclaration = !!tag;
        const ret = ts.visitEachChild(node, visit, ctx);
        if (isRemovableImportDeclaration) {
          isRemovableImportDeclaration = false;
          return undefined;
        }
        isRemovableImportDeclaration = false;
        return ret;
      }
      if (ts.isImportSpecifier(node)) {
        const removed = !!tag && node.name.text === tag;
        isRemovableImportDeclaration = isRemovableImportDeclaration && removed;
        return removed ? undefined : node;
      }

      if (ts.isImportClause(node) && !!node.name) {
        const removed = !!tag && node.name?.text === tag;
        isRemovableImportDeclaration = isRemovableImportDeclaration && removed;
        const ret = ts.visitEachChild(node, visit, ctx);
        if (!removed) return ret;
        return ts.updateImportClause(ret, undefined, ret.namedBindings);
      }

      if (ts.isTaggedTemplateExpression(node) && (!tag || (ts.isIdentifier(node.tag) && node.tag.text === tag))) {
        templateNode = node.template;
      } else if (!tag && ts.isNoSubstitutionTemplateLiteral(node)) {
        templateNode = node;
      } else if (!tag && ts.isTemplateExpression(node)) {
        templateNode = node;
      } else {
        return ts.visitEachChild(node, visit, ctx);
      }
      if (!templateNode) return ts.visitEachChild(node, visit, ctx);
      const originalDocumentNode = getDocumentNode(templateNode);
      if (!originalDocumentNode) return ts.visitEachChild(node, visit, ctx);
      const documentNode = documentTransformers.reduce((doc, dt) => dt(doc), originalDocumentNode);
      if (!documentNode) return ts.visitEachChild(node, visit, ctx);
      const toBeRemoved =
        removeFragmentDefinitons && documentNode.definitions.every(def => def.kind === 'FragmentDefinition');
      if (target === 'text') {
        if (toBeRemoved) return ts.createStringLiteral('');
        return ts.createStringLiteral(print(documentNode));
      }
      if (toBeRemoved) return ts.createNumericLiteral('0');
      return toObjectNode(documentNode);
    };
    return (sourceFile: ts.SourceFile) => ts.visitEachChild(sourceFile, visit, ctx);
  };
}
