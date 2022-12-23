import ts from 'typescript';
import { DocumentNode, print } from 'graphql';
import { astf, hasTagged, removeAliasFromImportDeclaration } from '../ts-ast-util';

export type DocumentTransformer = (documentNode: DocumentNode) => DocumentNode;

export type TransformOptions = {
  tag?: string;
  documentTransformers: DocumentTransformer[];
  removeFragmentDefinitions: boolean;
  target: 'text' | 'object';
  getDocumentNode: (node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression) => DocumentNode | undefined;
  getEnabled: () => boolean;
};

function toObjectNode(field: any): ts.Expression {
  if (field === null) {
    return astf.createNull();
  } else if (typeof field === 'boolean') {
    return field ? astf.createTrue() : astf.createFalse();
  } else if (typeof field === 'number') {
    return astf.createNumericLiteral(field + '');
  } else if (typeof field === 'string') {
    return astf.createStringLiteral(field);
  } else if (Array.isArray(field)) {
    return astf.createArrayLiteralExpression(field.map(item => toObjectNode(item)));
  }
  return astf.createObjectLiteralExpression(
    Object.entries(field)
      .filter(([k, v]) => k !== 'loc' && v !== undefined)
      .map(([k, v]) => astf.createPropertyAssignment(astf.createIdentifier(k), toObjectNode(v))),
    true,
  );
}

export function getTransformer({
  tag,
  target,
  getDocumentNode,
  removeFragmentDefinitions,
  documentTransformers,
  getEnabled,
}: TransformOptions) {
  return (ctx: ts.TransformationContext) => {
    const visit = (node: ts.Node): ts.Node | undefined => {
      if (!getEnabled()) return node;
      let templateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | undefined = undefined;

      if (tag && ts.isImportDeclaration(node)) {
        return removeAliasFromImportDeclaration(node, tag);
      }

      if (ts.isTaggedTemplateExpression(node) && (!tag || hasTagged(node, tag))) {
        templateNode = node.template;
      } else if (!tag && ts.isNoSubstitutionTemplateLiteral(node)) {
        templateNode = node;
      } else if (!tag && ts.isTemplateExpression(node)) {
        templateNode = node;
      }

      if (!templateNode) return ts.visitEachChild(node, visit, ctx);

      const originalDocumentNode = getDocumentNode(templateNode);
      if (!originalDocumentNode) return ts.visitEachChild(node, visit, ctx);
      const documentNode = documentTransformers.reduce((doc, dt) => dt(doc), originalDocumentNode);
      if (!documentNode) return ts.visitEachChild(node, visit, ctx);
      const toBeRemoved =
        removeFragmentDefinitions && documentNode.definitions.every(def => def.kind === 'FragmentDefinition');
      if (target === 'text') {
        if (toBeRemoved) return astf.createStringLiteral('');
        return astf.createStringLiteral(print(documentNode));
      }
      if (toBeRemoved) return astf.createNumericLiteral('0');
      return toObjectNode(documentNode);
    };
    return (sourceFile: ts.SourceFile) => ts.visitEachChild(sourceFile, visit, ctx);
  };
}
