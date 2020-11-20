import ts from 'typescript';
import type {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLScalarType,
} from 'graphql/type';
import type { DocumentNode, OperationDefinitionNode, FragmentDefinitionNode } from 'graphql/language';
import { OutputSource } from '../../ts-ast-util/types';

type GraphQLFragmentTypeConditionNamedType = GraphQLObjectType | GraphQLUnionType | GraphQLInterfaceType;

type ToStrict<T> = { [P in keyof T]-?: T[P] };
export type StrictAddon = ToStrict<TypeGenVisitorAddon>;

/**
 *
 * Creates Type Generator addon object.
 * This factory function is called back for each GraphQL template string.
 *
 */
export interface TypeGenAddonFactory {
  /**
   *
   * @param context - @see TypeGenVisitorAddonContext
   * @returns Addon
   *
   */
  (context: TypeGenVisitorAddonContext): TypeGenVisitorAddon;
}

export interface TypeGenVisitorAddonContext {
  /**
   *
   * Referenced GraphQL schema object.
   *
   */
  readonly schema: GraphQLSchema;

  /**
   *
   * Utility object to mutate output source file.
   * @see OutputSource
   *
   */
  readonly source: OutputSource;

  /**
   *
   * Where the template string is located.
   * @see ExtractedInfo
   *
   */
  readonly extractedInfo: ExtractedInfo;
}

/**
 *
 * Represents where the template string including the GraphQL operation or fragments are located.
 *
 */
export interface ExtractedInfo {
  /**
   *
   * File path of the .ts file which contains the GraphQL template string.
   *
   */
  readonly fileName: string;

  /**
   *
   * TypeScript source file object which contains the GraphQL template string.
   *
   */
  readonly tsSourceFile: ts.SourceFile;

  /**
   *
   * Template string AST node correspondig the GraphQL operation or fragments.
   *
   */
  readonly tsTemplateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
}

export interface TypeGenVisitorAddon {
  /**
   *
   * Reacts when the type generator visits GraphQL Scalar field.
   * This function can return corresponding TypeScript type node.
   *
   * @remarks
   * This function can not how to serialize/desirialize the custom scalar but how to map scalar to TypeScript type only.
   * You should consistence beteween runtime serialize behavior and type mapping.
   *
   * @example
   *
   * If your schema has a custom scalar type `Date` and your GraphQL client deserializes it to JavaScript native string,
   * you can implment this type mapping as the following:
   *
   * ```graphql
   * scalar Date
   * type Post {
   *   id: ID!
   *   publishedAt: Date!
   * }
   * ```
   *
   * ```ts
   * const factory: TypeGenAddonFactory = () => ({
   *   customScalar({ scalarType }) {
   *     if (scalarType.name === 'Date') {
   *       return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
   *     }
   *   },
   * });
   * ```
   *
   * @param input - contains GraphQL Scalar type.
   * @return Corresponding TypeScript type node. If return undefined, the TypeScript type is determined by the core type generator.
   *
   */
  customScalar?: (input: CustomScalarInput) => CustomScalarOutput;

  /**
   *
   * Reacts when the type generator visits whole GraphQL document node.
   *
   * @param input - contains the GraphQL document AST node.
   *
   */
  document?: (input: DocumentInput) => void;

  /**
   *
   * Reacts when the type generator visits GraphQL operation difinition node.
   * It's useful if you want to process query or variables types.
   *
   * @example
   *
   * ```ts
   * const factory: TypeGenAddonFactory = ({ source }) => ({
   *   operationDefinition({ tsResultNode }) {
   *     const additionalTypeStatement = createAwesomeType(tsResultNode);
   *     source.pushStatement(additionalTypeStatement);
   *   },
   * });
   * ```
   *
   * @param input - contains query/variable TypeScript type declaration node. @see OperationDefinionInput
   *
   */
  operationDefinition?: (input: OperationDefinionInput) => void;

  /**
   *
   * Reacts when the type generator visits GraphQL fragment difinition node.
   *
   * @param input - contains fragment TypeScript type declaration node. @see FragmentDefinitionInput
   *
   */
  fragmentDefinition?: (input: FragmentDefinitionInput) => void;
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
