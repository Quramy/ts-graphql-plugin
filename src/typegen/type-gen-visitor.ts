import ts from 'typescript';
import {
  GraphQLSchema,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  ASTNode,
  NamedTypeNode,
  TypeNode,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql';
import { visit } from 'graphql/language';
import { OutputSource } from '../ts-ast-util/types';
import { StrictAddon } from './addon/types';

class Stack<T> {
  private _array: T[] = [];
  constructor(private readonly _initializer?: () => T) {}
  get current() {
    if (!this._array.length) {
      throw new Error('Invalid stack state.');
    }
    return this._array[this._array.length - 1];
  }
  stack(value?: T) {
    if (value === undefined && this._initializer) {
      this._array.push(this._initializer());
      return this;
    } else if (value !== undefined) {
      this._array.push(value);
      return this;
    } else {
      throw new Error();
    }
  }
  consume() {
    const current = this.current;
    this._array.pop();
    return current;
  }
  get isEmpty() {
    return this._array.length === 0;
  }
}

type StructualModifierKind = 'null' | 'list';
class StructureStack extends Stack<StructualModifierKind> {}

type GraphQLFragmentTypeConditionNamedType = GraphQLObjectType | GraphQLUnionType | GraphQLInterfaceType;

interface FieldModifier {
  structureStack: StructureStack;
}

interface FieldMetadata extends FieldModifier {
  fieldType: GraphQLOutputType;
}

interface FieldTypeElement {
  members: ts.TypeElement[];
  typeFragments: {
    isUnionCondition: boolean;
    typeNode: ts.TypeNode;
  }[];
}

export class TypeGenError extends Error {
  constructor(public readonly message: string, public readonly node: ASTNode) {
    super(message);
  }
}

export type TypeGenVisitorOptions = {
  schema: GraphQLSchema;
};

export type VisitOption = {
  outputSource: OutputSource;
  addon: StrictAddon;
};

export class TypeGenVisitor {
  private readonly _schema: GraphQLSchema;
  constructor({ schema }: TypeGenVisitorOptions) {
    this._schema = schema;
  }
  visit(documentNode: DocumentNode, { outputSource, addon }: VisitOption) {
    const parentTypeStack = new Stack<GraphQLFragmentTypeConditionNamedType>();
    const resultFieldElementStack = new Stack<FieldTypeElement>(() => ({
      members: [],
      typeFragments: [],
    }));
    const variableElementStack = new Stack<FieldTypeElement>(() => ({
      members: [],
      typeFragments: [],
    }));
    const fieldMetadataMap = new Map<FieldNode, FieldMetadata>();
    const fragmentMap = new Map<string, FragmentDefinitionNode>();
    documentNode.definitions.forEach(def => {
      if (def.kind === 'FragmentDefinition') {
        fragmentMap.set(def.name.value, def);
      }
    });
    const processedInputObjectSet = new WeakSet<GraphQLInputObjectType>();

    visit(documentNode, {
      OperationDefinition: {
        enter: node => {
          if (node.operation === 'query') {
            const queryType = this._schema.getQueryType();
            if (!queryType) {
              throw new TypeGenError(`Schema does not have Query type.`, node);
            }
            parentTypeStack.stack(queryType);
            resultFieldElementStack.stack();
          } else if (node.operation === 'mutation') {
            const mutationType = this._schema.getMutationType();
            if (!mutationType) {
              throw new TypeGenError(`Schema does not have Mutation type.`, node);
            }
            parentTypeStack.stack(mutationType);
            resultFieldElementStack.stack();
          } else if (node.operation === 'subscription') {
            const subscriptionType = this._schema.getSubscriptionType();
            if (!subscriptionType) {
              throw new TypeGenError(`Schema does not have Subscription type.`, node);
            }
            parentTypeStack.stack(subscriptionType);
            resultFieldElementStack.stack();
          }
          variableElementStack.stack();
        },
        leave: node => {
          const tsResultNode = this._createTsTypeDeclaration(
            node.name ? node.name.value : 'QueryResult',
            resultFieldElementStack.consume(),
          );
          outputSource.pushStatement(tsResultNode);
          const tsVariableNode = this._createTsTypeDeclaration(
            node.name ? node.name.value + 'Variables' : 'QueryVariables',
            variableElementStack.consume(),
          );
          outputSource.pushStatement(tsVariableNode);
          const operationType = parentTypeStack.consume() as GraphQLObjectType;
          addon.operationDefinition({ graqhqlNode: node, operationType, tsResultNode, tsVariableNode });
        },
      },
      VariableDefinition: {
        leave: node => {
          const {
            typeNode: {
              name: { value: inputTypeName },
            },
            structureStack,
          } = this._getFieldMetadataFromTypeNode(node.type);
          const variableType = this._schema.getType(inputTypeName) as GraphQLInputType;
          if (!variableType) {
            throw new TypeGenError(`Schema does not have InputType "${inputTypeName}".`, node);
          }
          const visitVariableType = (
            name: string,
            variableType: GraphQLInputType,
            structureStack: StructureStack,
            optional: boolean,
          ) => {
            let typeNode: ts.TypeNode | undefined;
            if (variableType instanceof GraphQLScalarType) {
              typeNode = this._createTsTypeNodeFromScalar(variableType, addon);
            } else if (variableType instanceof GraphQLEnumType) {
              typeNode = this._createTsTypeNodeFromEnum(variableType);
            } else if (variableType instanceof GraphQLInputObjectType) {
              const tsTypeRefName = variableType.name + 'InputType';
              if (!processedInputObjectSet.has(variableType)) {
                processedInputObjectSet.add(variableType);
                variableElementStack.stack();
                Object.entries(variableType.getFields()).forEach(([fieldName, v]) => {
                  const { fieldType, structureStack } = this._getFieldMetadataFromFieldTypeInstance(v);
                  visitVariableType(fieldName, fieldType, structureStack, false);
                });
                const declaration = this._createTsTypeDeclaration(tsTypeRefName, variableElementStack.consume(), false);
                outputSource.pushStatement(declaration);
              }
              typeNode = ts.createTypeReferenceNode(tsTypeRefName, undefined);
            }
            if (!typeNode) {
              throw new Error('Unknown variable input type. ' + variableType.toJSON());
            }
            const { node: tn, lastStructureKind } = this._wrapTsTypeNodeWithStructualModifiers(
              typeNode,
              structureStack,
            );
            typeNode = tn;
            variableElementStack.current.members.push(
              ts.createPropertySignature(
                undefined,
                name,
                optional || lastStructureKind === 'null' ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                typeNode,
                undefined,
              ),
            );
          };
          visitVariableType(node.variable.name.value, variableType, structureStack, !!node.defaultValue);
        },
      },
      FragmentDefinition: {
        enter: node => {
          const conditionNamedType = this._schema.getType(
            node.typeCondition.name.value,
          )! as GraphQLFragmentTypeConditionNamedType;
          parentTypeStack.stack(conditionNamedType);
          resultFieldElementStack.stack();
        },
        leave: node => {
          const conditionType = parentTypeStack.consume();
          const tsNode = this._createTsTypeDeclaration(node.name.value, resultFieldElementStack.consume());
          outputSource.pushStatement(tsNode);
          addon.fragmentDefinition({ conditionType, graphqlNode: node, tsNode });
        },
      },
      FragmentSpread: {
        leave: node => {
          const fragmentDefNode = fragmentMap.get(node.name.value)!;
          const isUnionCondition = this._isConcreteTypeOfParentUnionType(
            fragmentDefNode.typeCondition,
            parentTypeStack.current,
          );
          resultFieldElementStack.current.typeFragments.push({
            isUnionCondition,
            typeNode: ts.createTypeReferenceNode(node.name.value, undefined),
          });
        },
      },
      InlineFragment: {
        enter: node => {
          if (!node.typeCondition) return;
          const conditionNamedType = this._schema.getType(
            node.typeCondition.name.value,
          )! as GraphQLFragmentTypeConditionNamedType;
          parentTypeStack.stack(conditionNamedType);
          resultFieldElementStack.stack();
        },
        leave: node => {
          if (!node.typeCondition) return;
          parentTypeStack.consume();
          const typeNode = this._createTsFieldTypeNode(resultFieldElementStack.consume());
          const isUnionCondition = this._isConcreteTypeOfParentUnionType(node.typeCondition, parentTypeStack.current);
          resultFieldElementStack.current.typeFragments.push({
            isUnionCondition,
            typeNode,
          });
        },
      },
      Field: {
        enter: node => {
          if (node.name.value === '__typename') return;
          if (parentTypeStack.current instanceof GraphQLUnionType) {
            throw new TypeGenError("Selections can't be made directly on unions.", node);
          }
          const field = parentTypeStack.current.getFields()[node.name.value];
          if (!field) {
            throw new TypeGenError(
              `Type "${parentTypeStack.current.name}" does not have field "${node.name.value}".`,
              node,
            );
          }
          const fieldMetadata = this._getFieldMetadataFromFieldTypeInstance(field);
          if (
            fieldMetadata.fieldType instanceof GraphQLObjectType ||
            fieldMetadata.fieldType instanceof GraphQLInterfaceType ||
            fieldMetadata.fieldType instanceof GraphQLUnionType
          ) {
            parentTypeStack.stack(fieldMetadata.fieldType);
            resultFieldElementStack.stack();
          }
          fieldMetadataMap.set(node, fieldMetadata);
        },
        leave: node => {
          if (node.name.value === '__typename') {
            resultFieldElementStack.current.members.push(
              this._createTsDoubleUnderscoreTypenameFieldType(parentTypeStack.current),
            );
            return;
          }
          const { fieldType, structureStack } = fieldMetadataMap.get(node)!;
          let typeNode: ts.TypeNode | undefined;
          if (fieldType instanceof GraphQLScalarType) {
            typeNode = this._createTsTypeNodeFromScalar(fieldType, addon);
          } else if (fieldType instanceof GraphQLEnumType) {
            typeNode = this._createTsTypeNodeFromEnum(fieldType);
          } else if (
            fieldType instanceof GraphQLObjectType ||
            fieldType instanceof GraphQLInterfaceType ||
            fieldType instanceof GraphQLUnionType
          ) {
            typeNode = this._createTsFieldTypeNode(resultFieldElementStack.consume());
            parentTypeStack.consume();
          }
          if (!typeNode) {
            throw new Error('Unknown field output type. ' + fieldType.toJSON());
          }
          typeNode = this._wrapTsTypeNodeWithStructualModifiers(typeNode, structureStack).node;
          resultFieldElementStack.current.members.push(
            ts.createPropertySignature(
              undefined,
              node.alias ? node.alias.value : node.name.value,
              undefined,
              typeNode,
              undefined,
            ),
          );
          fieldMetadataMap.delete(node);
        },
      },
    });
    addon.document({ graphqlNode: documentNode });
    outputSource.writeLeadingComment('eslint-disable');
    outputSource.writeLeadingComment('This is an autogenerated file. Do not edit this file directly!');
    return outputSource.toSourceFile();
  }

  private _getFieldMetadataFromFieldTypeInstance<T extends GraphQLField<any, any> | GraphQLInputField>(field: T) {
    let fieldType = field!.type;
    const structureStack = new StructureStack().stack('null');
    while (fieldType instanceof GraphQLNonNull || fieldType instanceof GraphQLList) {
      if (fieldType instanceof GraphQLList) {
        structureStack.stack('list').stack('null');
      } else if (fieldType instanceof GraphQLNonNull) {
        structureStack.consume();
      }
      fieldType = fieldType.ofType;
    }
    return {
      fieldType: fieldType as T extends GraphQLField<any, any>
        ? GraphQLOutputType
        : T extends GraphQLInputField
        ? GraphQLInputType
        : never,
      structureStack,
    };
  }

  private _getFieldMetadataFromTypeNode(node: TypeNode) {
    let typeNode = node;
    const structureStack = new StructureStack().stack('null');
    while (typeNode.kind !== 'NamedType') {
      if (typeNode.kind === 'ListType') {
        structureStack.stack('list').stack('null');
      } else if (typeNode.kind === 'NonNullType') {
        structureStack.consume();
      }
      typeNode = typeNode.type;
    }
    return { typeNode, structureStack };
  }

  private _isConcreteTypeOfParentUnionType(
    typeCondition: NamedTypeNode,
    parentType: GraphQLFragmentTypeConditionNamedType,
  ) {
    if (parentType instanceof GraphQLUnionType) {
      const unionElementTypes = parentType.getTypes();
      return unionElementTypes.some(ut => ut.name === typeCondition.name.value);
    } else {
      return false;
    }
  }

  private _wrapTsTypeNodeWithStructualModifiers(typeNode: ts.TypeNode, structureStack: StructureStack) {
    let node = typeNode;
    let kind: StructualModifierKind | undefined = undefined;
    while (!structureStack.isEmpty) {
      kind = structureStack.consume();
      node =
        kind === 'null'
          ? ts.createUnionTypeNode([
              node,
              ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword as ts.KeywordTypeSyntaxKind),
            ])
          : kind === 'list'
          ? ts.createArrayTypeNode(node)
          : node;
    }
    return { node, lastStructureKind: kind };
  }

  private _createTsTypeNodeFromEnum(fieldType: GraphQLEnumType) {
    return ts.createUnionTypeNode(
      fieldType.getValues().map(v => ts.createLiteralTypeNode(ts.createStringLiteral(v.value))),
    );
  }

  private _createTsDoubleUnderscoreTypenameFieldType(parentType: GraphQLFragmentTypeConditionNamedType) {
    if (parentType instanceof GraphQLObjectType) {
      return ts.createPropertySignature(
        undefined,
        '__typename',
        undefined,
        ts.createLiteralTypeNode(ts.createStringLiteral(parentType.name)),
        undefined,
      );
    } else if (parentType instanceof GraphQLUnionType) {
      return ts.createPropertySignature(
        undefined,
        '__typename',
        undefined,
        ts.createUnionTypeNode(
          parentType.getTypes().map(t => ts.createLiteralTypeNode(ts.createStringLiteral(t.name))),
        ),
        undefined,
      );
    } else {
      return ts.createPropertySignature(
        undefined,
        '__typename',
        undefined,
        ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        undefined,
      );
    }
  }

  private _createTsTypeNodeFromScalar(fieldType: GraphQLScalarType, addon: StrictAddon) {
    const typeNode = addon.customScalar({ scalarType: fieldType });
    if (typeNode) return typeNode;
    switch (fieldType.name) {
      case 'Boolean':
        return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      case 'String':
      case 'ID':
        return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      case 'Int':
      case 'Float':
        return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
      default:
        return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    }
  }

  private _createTsTypeDeclaration(name: string, fieldTypeElement: FieldTypeElement, shouldExport = true) {
    const modifiers = shouldExport ? ts.createModifiersFromModifierFlags(ts.ModifierFlags.Export) : undefined;
    return ts.createTypeAliasDeclaration(
      undefined,
      modifiers,
      name,
      undefined,
      this._createTsFieldTypeNode(fieldTypeElement),
    );
  }

  private _createTsFieldTypeNode({ members, typeFragments }: FieldTypeElement) {
    if (!members.length && !typeFragments.length) {
      return ts.createTypeLiteralNode(undefined);
    }
    const toUnionElements: ts.TypeNode[] = [];
    const toIntersectionElements: ts.TypeNode[] = [];
    typeFragments.forEach(({ isUnionCondition, typeNode }) => {
      if (isUnionCondition) {
        toUnionElements.push(typeNode);
      } else {
        toIntersectionElements.push(typeNode);
      }
    });
    if (toUnionElements.length) {
      toIntersectionElements.push(ts.createUnionTypeNode(toUnionElements));
    }
    if (members.length) {
      toIntersectionElements.unshift(ts.createTypeLiteralNode(members));
    }
    return ts.createIntersectionTypeNode(toIntersectionElements);
  }
}
