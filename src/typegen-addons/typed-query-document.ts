import ts from 'typescript';
import { TypeGenAddonFactory } from '../typegen';

export const TypedQueryDocumentAddonFactory: TypeGenAddonFactory = ({ source }) => ({
  operationDefinition({ tsResultNode, tsVariableNode }) {
    const lhs = ts.createIdentifier(`${tsResultNode.name.text}Document`);
    const rhs = ts.createTypeReferenceNode(ts.createIdentifier('TypedQueryDocumentNode'), [
      ts.createTypeReferenceNode(ts.createIdentifier(tsResultNode.name.text)),
      ts.createTypeReferenceNode(ts.createIdentifier(tsVariableNode.name.text)),
    ]);
    const modifiers = [ts.createModifier(ts.SyntaxKind.ExportKeyword)];
    const typeAliasDeclaration = ts.createTypeAliasDeclaration(undefined, modifiers, lhs, undefined, rhs);
    source.pushNamedImportIfNeeded('TypedQueryDocumentNode', 'graphql');
    source.pushStatement(typeAliasDeclaration);
  },
});
