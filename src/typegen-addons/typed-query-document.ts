import ts from 'typescript';
import { TypeGenAddonFactory } from '../typegen';

export const TypedQueryDocumentAddonFactory: TypeGenAddonFactory = ({ source }) => ({
  operationDefinition({ tsResultNode, tsVariableNode }) {
    const lhs = ts.createIdentifier(`${tsResultNode.name.text}Document`);
    const rhs = ts.createTypeReferenceNode(ts.factory.createIdentifier('TypedQueryDocumentNode'), [
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(tsResultNode.name.text)),
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(tsVariableNode.name.text)),
    ]);
    const modifiers = [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)];
    const typeAliasDeclaration = ts.factory.createTypeAliasDeclaration(undefined, modifiers, lhs, undefined, rhs);
    source.pushNamedImportIfNeeded('TypedQueryDocumentNode', 'graphql');
    source.pushStatement(typeAliasDeclaration);
  },
});
