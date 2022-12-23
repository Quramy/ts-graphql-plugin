import ts from 'typescript';
import { TypeGenAddonFactory } from '../typegen';
import { astf } from '../ts-ast-util';

export const TypedQueryDocumentAddonFactory: TypeGenAddonFactory = ({ source }) => ({
  operationDefinition({ tsResultNode, tsVariableNode }) {
    const lhs = astf.createIdentifier(`${tsResultNode.name.text}Document`);
    const rhs = astf.createTypeReferenceNode(astf.createIdentifier('TypedQueryDocumentNode'), [
      astf.createTypeReferenceNode(astf.createIdentifier(tsResultNode.name.text)),
      astf.createTypeReferenceNode(astf.createIdentifier(tsVariableNode.name.text)),
    ]);
    const modifiers = [astf.createModifier(ts.SyntaxKind.ExportKeyword)];
    const typeAliasDeclaration = astf.createTypeAliasDeclaration(modifiers, lhs, undefined, rhs);
    source.pushNamedImportIfNeeded('TypedQueryDocumentNode', 'graphql');
    source.pushStatement(typeAliasDeclaration);
  },
});
