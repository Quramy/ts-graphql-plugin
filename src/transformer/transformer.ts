import ts from 'typescript';
import { DocumentNode, print } from 'graphql';

export type DocumentTransformer = (documentNode: DocumentNode) => DocumentNode;

export type TransformOptions = {
  tag?: string;
  documentTransformers: DocumentTransformer[];
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

export function getTransformer({ tag, target, getDocumentNode, documentTransformers }: TransformOptions) {
  return (ctx: ts.TransformationContext) => {
    const visit = (node: ts.Node): ts.Node | undefined => {
      let templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | undefined = undefined;
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
      if (target === 'text') {
        return ts.createStringLiteral(print(documentNode));
      }
      return toObjectNode(documentNode);
    };
    return (sourceFile: ts.SourceFile) => ts.visitEachChild(sourceFile, visit, ctx);
  };
}
