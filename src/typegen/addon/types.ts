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
   * Utility object to mutate output source file. @see OutputSource
   *
   */
  readonly source: OutputSource;

  /**
   *
   * Where the GraphQL template string is located. @see ExtractedInfo
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
   * Template string AST node corresponding the GraphQL operation or fragments.
   *
   */
  readonly tsTemplateNode: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
}

/**
 *
 * The addon object's methods are called back during the core type generator visits each GraphQL node in the template string.
 * And one addon object is generated for one template string.
 *
 * You don't have to implement all methods.
 *
 */
export interface TypeGenVisitorAddon {
  /**
   *
   * Reacts when the type generator visits GraphQL Scalar field.
   * This function can return corresponding TypeScript type node.
   *
   * @remarks
   * This function can not how to serialize/deserialize the custom scalar but how to map scalar to TypeScript type only.
   * You should consistence between runtime serialize behavior and type mapping.
   *
   * @example
   *
   * If your schema has a custom scalar type `Date` and your GraphQL client deserializes it to JavaScript native string,
   * you can implement this type mapping as the following:
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
   * Reacts when the type generator visits GraphQL operation definition node.
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
   * Reacts when the type generator visits GraphQL fragment definition node.
   *
   * @param input - contains fragment TypeScript type declaration node. @see FragmentDefinitionInput
   *
   */
  fragmentDefinition?: (input: FragmentDefinitionInput) => void;
}

/**
 *
 * Input object for `TypeGenVisitorAddon.customScalar` callback.
 *
 */
export interface CustomScalarInput {
  /**
   *
   * Definition of type scalar type.
   *
   */
  readonly scalarType: GraphQLScalarType;
}

/**
 *
 * Output object for `TypeGenVisitorAddon.customScalar` callback.
 *
 */
export type CustomScalarOutput = void | ts.TypeNode;

/**
 *
 * Input object for `TypeGenVisitorAddon.document` callback.
 *
 */
export interface DocumentInput {
  /**
   *
   * GraphQL document AST node.
   *
   */
  readonly graphqlNode: DocumentNode;
}

/**
 *
 * Input object for `TypeGenVisitorAddon.operationDefinition` callback.
 *
 */
export interface OperationDefinionInput {
  /**
   *
   * GraphQL AST node of this operation.
   *
   */
  readonly graqhqlNode: OperationDefinitionNode;

  /**
   *
   * Definition of the operation. One of Query or Mutation or Subscription
   *
   */
  readonly operationType: GraphQLObjectType;

  /**
   *
   * TypeScript AST node which represents the result type of this operation.
   *
   */
  readonly tsResultNode: ts.TypeAliasDeclaration;

  /**
   *
   * TypeScript AST node which represents the variable type of this operation.
   *
   */
  readonly tsVariableNode: ts.TypeAliasDeclaration;
}

/**
 *
 * Input object for `TypeGenVisitorAddon.fragmentDefinition` callback.
 *
 */
export interface FragmentDefinitionInput {
  /**
   *
   * GraphQL AST node of this fragment
   *
   */
  readonly graphqlNode: FragmentDefinitionNode;

  /**
   *
   * Named type(object or interface or union type) this fragment is specified on.
   *
   */
  readonly conditionType: GraphQLFragmentTypeConditionNamedType;

  /**
   *
   * TypeScript AST node which represents this fragment type.
   *
   */
  readonly tsNode: ts.TypeAliasDeclaration;
}
