import ts from 'typescript';
import type {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLScalarType,
} from 'graphql/type';
import type { DocumentNode, OperationDefinitionNode, FragmentDefinitionNode } from 'graphql/language';
import { SourceWriteHelper } from '../../ts-ast-util/types';

type GraphQLFragmentTypeConditionNamedType = GraphQLObjectType | GraphQLUnionType | GraphQLInterfaceType;

export interface TypeGenVisitorAddon {
  customScalar?: (input: CustomScalarInput) => CustomScalarOutput;
  document?: (input: DocumentInput) => void;
  operationDefiniton?: (input: OperationDefinionInput) => void;
  fragmentDefinition?: (input: FragmentDefinitionInput) => void;
}

type ToStrict<T> = { [P in keyof T]-?: T[P] };
export type StrictAddon = ToStrict<TypeGenVisitorAddon>;

export interface TypeGenAddonFactory {
  (context: TypeGenVisitorAddonContext): TypeGenVisitorAddon;
}

export interface TypeGenVisitorAddonContext {
  readonly schema: GraphQLSchema;
  readonly extractedInfo: {
    readonly fileName: string;
    readonly tsSourceFile: ts.SourceFile;
    readonly tsTemplateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  };
  readonly source: SourceWriteHelper;
}

export interface CustomScalarInput {
  readonly scalarType: GraphQLScalarType;
}

export type CustomScalarOutput = void | ts.TypeNode;

export interface DocumentInput {
  readonly graphqlNode: DocumentNode;
}

export interface OperationDefinionInput {
  readonly graqhqlNode: OperationDefinitionNode;
  readonly operationType: GraphQLObjectType;
  readonly tsResultNode: ts.TypeAliasDeclaration;
  readonly tsVariableNode: ts.TypeAliasDeclaration;
}

export interface FragmentDefinitionInput {
  readonly graphqlNode: FragmentDefinitionNode;
  readonly fragmentType: GraphQLFragmentTypeConditionNamedType;
  readonly tsNode: ts.TypeAliasDeclaration;
}
