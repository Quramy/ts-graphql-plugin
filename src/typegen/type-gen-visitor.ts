import ts from 'typescript';
import {
  GraphQLSchema,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
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
      return;
    } else if (value !== undefined) {
      this._array.push(value);
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

type ListTypeKind = 'none' | 'nullableList' | 'strictList';

type GraphQLFragmentTypeConditionNamedType = GraphQLObjectType | GraphQLUnionType | GraphQLInterfaceType;

interface FieldModifier {
  list: ListTypeKind;
  strict: boolean;
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

export type TypeGenVisitorOptions = {
  schema: GraphQLSchema;
};

export type VisitOption = {
  outputFileName: string;
};

export class TypeGenVisitor {
  private readonly _schema: GraphQLSchema;
  constructor({ schema }: TypeGenVisitorOptions) {
    this._schema = schema;
  }
  visit(documentNode: DocumentNode, { outputFileName }: VisitOption) {
    const statements: ts.Statement[] = [];
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

    visit(documentNode, {
      OperationDefinition: {
        enter: node => {
          if (node.operation === 'query') {
            parentTypeStack.stack(this._schema.getQueryType()!);
            resultFieldElementStack.stack();
          } else if (node.operation === 'mutation') {
            parentTypeStack.stack(this._schema.getMutationType()!);
            resultFieldElementStack.stack();
          } else if (node.operation === 'subscription') {
            parentTypeStack.stack(this._schema.getSubscriptionType()!);
            resultFieldElementStack.stack();
          }
          variableElementStack.stack();
        },
        leave: node => {
          statements.push(
            this._createTsTypeDeclaration(
              node.name ? node.name.value : 'QueryResult',
              resultFieldElementStack.consume(),
            ),
          );
          statements.push(
            this._createTsTypeDeclaration(
              node.name ? node.name.value + 'Variables' : 'QueryVariables',
              variableElementStack.consume(),
            ),
          );
          parentTypeStack.consume();
        },
      },
      VariableDefinition: {
        leave: node => {
          const {
            typeNode: {
              name: { value: inputTypeName },
            },
            list,
            strict,
          } = this._getFieldMetadataFromTypeNode(node.type);
          const variableType = this._schema.getType(inputTypeName)! as GraphQLInputType;
          const visitVariableType = (
            name: string,
            variableType: GraphQLInputType,
            list: ListTypeKind,
            strict: boolean,
            optional: boolean,
          ) => {
            let typeNode: ts.TypeNode | undefined;
            if (variableType instanceof GraphQLScalarType) {
              typeNode = this._createTsTypeNodeFromScalar(variableType);
            } else if (variableType instanceof GraphQLEnumType) {
              typeNode = this._createTsTypeNodeFromEnum(variableType);
            } else if (variableType instanceof GraphQLInputObjectType) {
              variableElementStack.stack();
              Object.entries(variableType.getFields()).forEach(([fieldName, v]) => {
                const { fieldType, list, strict } = this._getFieldMetadataFromFieldTypeInstance(v);
                visitVariableType(fieldName, fieldType, list, strict, false);
              });
              typeNode = this._createTsFieldTypeNode(variableElementStack.consume());
            }
            if (!typeNode) {
              throw new Error('Unknown variable input type. ' + variableType.toJSON());
            }
            typeNode = this._wrapTsTypeNodeWithModifiers(typeNode, list, strict);
            variableElementStack.current.members.push(
              ts.createPropertySignature(
                undefined,
                name,
                optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                typeNode,
                undefined,
              ),
            );
          };
          visitVariableType(node.variable.name.value, variableType, list, strict, !!node.defaultValue);
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
          statements.push(this._createTsTypeDeclaration(node.name.value, resultFieldElementStack.consume()));
          parentTypeStack.consume();
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
            throw new Error("Selections can't be made directly on unions");
          }
          const field = parentTypeStack.current.getFields()[node.name.value];
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
          const { fieldType, strict, list } = fieldMetadataMap.get(node)!;
          let typeNode: ts.TypeNode | undefined;
          if (fieldType instanceof GraphQLScalarType) {
            typeNode = this._createTsTypeNodeFromScalar(fieldType);
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
          typeNode = this._wrapTsTypeNodeWithModifiers(typeNode, list, strict);
          resultFieldElementStack.current.members.push(
            ts.createPropertySignature(undefined, node.name.value, undefined, typeNode, undefined),
          );
          fieldMetadataMap.delete(node);
        },
      },
    });

    const sourceFile = ts.createSourceFile(outputFileName, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const resultFile = ts.updateSourceFileNode(sourceFile, statements);
    if (resultFile.statements.length) {
      ts.addSyntheticLeadingComment(
        resultFile.statements[0],
        ts.SyntaxKind.MultiLineCommentTrivia,
        ' eslint-disable ',
        true,
      );
      ts.addSyntheticLeadingComment(
        resultFile.statements[0],
        ts.SyntaxKind.MultiLineCommentTrivia,
        ' This is an autogenerated file. Do not edit this file directly! ',
        true,
      );
    }
    return resultFile;
  }

  private _getFieldMetadataFromFieldTypeInstance<T extends GraphQLField<any, any> | GraphQLInputField>(field: T) {
    let fieldType = field!.type;
    let listTypeKind: ListTypeKind | undefined;
    let isStrict: boolean | undefined;
    if (fieldType instanceof GraphQLNonNull) {
      fieldType = fieldType.ofType;
      if (fieldType instanceof GraphQLList) {
        fieldType = fieldType.ofType;
        listTypeKind = 'strictList';
        if (fieldType instanceof GraphQLNonNull) {
          fieldType = fieldType.ofType;
          isStrict = true;
        } else {
          isStrict = false;
        }
      } else {
        isStrict = true;
        listTypeKind = 'none';
      }
    } else if (fieldType instanceof GraphQLList) {
      fieldType = fieldType.ofType;
      listTypeKind = 'nullableList';
      if (fieldType instanceof GraphQLNonNull) {
        fieldType = fieldType.ofType;
        isStrict = true;
      } else {
        isStrict = false;
      }
    } else {
      listTypeKind = 'none';
      isStrict = false;
    }
    return {
      fieldType: fieldType as T extends GraphQLField<any, any>
        ? GraphQLOutputType
        : T extends GraphQLInputField
        ? GraphQLInputType
        : never,
      list: listTypeKind,
      strict: isStrict,
    };
  }

  private _getFieldMetadataFromTypeNode(node: TypeNode) {
    let typeNode = node;
    let listTypeKind: ListTypeKind | undefined;
    let isStrict: boolean | undefined;
    if (typeNode.kind === 'NonNullType') {
      typeNode = typeNode.type;
      if (typeNode.kind === 'ListType') {
        typeNode = typeNode.type;
        listTypeKind = 'strictList';
        if (typeNode.kind === 'NonNullType') {
          typeNode = typeNode.type;
          isStrict = true;
        } else {
          isStrict = false;
        }
      } else {
        isStrict = true;
        listTypeKind = 'none';
      }
    } else if (typeNode.kind === 'ListType') {
      typeNode = typeNode.type;
      listTypeKind = 'nullableList';
      if (typeNode.kind === 'NonNullType') {
        typeNode = typeNode.type;
        isStrict = true;
      } else {
        isStrict = false;
      }
    } else {
      listTypeKind = 'none';
      isStrict = false;
    }
    return { typeNode: typeNode as NamedTypeNode, list: listTypeKind, strict: isStrict };
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

  private _wrapTsTypeNodeWithModifiers(typeNode: ts.TypeNode, list: ListTypeKind, strict: boolean) {
    if (!strict) {
      typeNode = ts.createUnionTypeNode([typeNode, ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword)]);
    }
    if (list === 'strictList' || list === 'nullableList') {
      typeNode = ts.createArrayTypeNode(typeNode);
      if (list === 'nullableList') {
        typeNode = ts.createUnionTypeNode([typeNode, ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword)]);
      }
    }
    return typeNode;
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

  private _createTsTypeNodeFromScalar(fieldType: GraphQLScalarType) {
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

  private _createTsTypeDeclaration(name: string, fieldTypeElement: FieldTypeElement) {
    return ts.createTypeAliasDeclaration(
      undefined,
      ts.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
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
