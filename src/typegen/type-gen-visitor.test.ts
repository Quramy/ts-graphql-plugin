import { TypeGenVisitor } from './type-gen-visitor';
import ts from 'typescript';
import { parse, buildSchema } from 'graphql';

function generateAstAndPrint({ schemaSDL, documentContent }: { schemaSDL: string; documentContent: string }) {
  const schema = buildSchema(schemaSDL);
  const documentNode = parse(documentContent);
  const source = new TypeGenVisitor().visit(documentNode, schema, { outputFileName: 'out.ts' });
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(source);
}

describe('typegen', () => {
  describe('variable type generation', () => {
    it('should gen type from scalar types', () => {
      const result = generateAstAndPrint({
        schemaSDL: `
          scalar MyScalar
          type Query {
            idInput(idValue: ID!): String!
            strInput(strValue: String!): String!
            intInput(intValue: Int!): String!
            floatInput(floatValue: Float!): String!
            boolInput(boolValue: Boolean!): String!
            customScalarInput(value: MyScalar!): String!
          }
        `,
        documentContent: `
          query MyQuery (
            $idVar: ID!,
            $strVar: String!,
            $intVar: Int!,
            $floatVar: Float!,
            $boolVar: Boolean!,
            $scalarVar: MyScalar!,
          ) {
            idInput(idValue: $idVar)
            strInput(strValue: $strVar)
            intInput(intValue: $intVar)
            floatInput(floatValue: $floatVar)
            boolInput(boolValue: $boolVar)
            customScalarInput(value: $scalarVar)
          }
        `,
      });
      expect(result).toMatchSnapshot();
    });

    it('should gen type from enum', () => {
      const result = generateAstAndPrint({
        schemaSDL: `
          enum Color {
            RED
            BLUE
            GREEN
          }
          type Query {
            enumInput(color: Color): String!
          }
        `,
        documentContent: `
          query MyQuery ($color: Color!) {
            enumInput(color: $color)
          }
        `,
      });
      expect(result).toMatchSnapshot();
    });

    it('should gen type from input object type', () => {
      const result = generateAstAndPrint({
        schemaSDL: `
          input Vector {
            x: Float!
            y: Float!
          }
          input Line {
            start: Vector!
            end: Vector!
          }
          type Query {
            lineInput(line: Line!): Float!
          }
        `,
        documentContent: `
          query MyQuery ($line: Line!) {
            lineInput(line: $line)
          }
        `,
      });
      expect(result).toMatchSnapshot();
    });

    it('should gen type with correct list/nonNull modifiers', () => {
      const result = generateAstAndPrint({
        schemaSDL: `
          type Query {
            nullableField(value: String): String!
            strictField(value: String): String!
            nullableFieldNullableList(value: [String]): String!
            nullableFieldStrictList(value: [String]!): String!
            strictFieldNullableList(value: [String!]): String!
            strictFieldStrictList(value: [String!]!): String!
          }
        `,
        documentContent: `
          query MyQuery (
            $var1: String,
            $var2: String!,
            $var3: [String],
            $var4: [String]!,
            $var5: [String!],
            $var6: [String!]!,
          ){
            nullableField(value: $var1)
            strictField(value: $var2)
            nullableFieldNullableList(value: $var3)
            nullableFieldStrictList(value: $var4)
            strictFieldNullableList(value: $var5)
            strictFieldStrictList(value: $var6)
          }
        `,
      });
      expect(result).toMatchSnapshot();
    });

    it('should gen optional type with default value variable', () => {
      const result = generateAstAndPrint({
        schemaSDL: `
          type Query {
            hello(count: Int!): String!
          }
        `,
        documentContent: `
          query MyQuery ($count: Int = 10) {
            hello(count: $count)
          }
        `,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('result type generation', () => {
    describe('output types pattern', () => {
      it('should gen type from built-in scalar types', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              idField: ID!
              stringField: String!
              intField: Int!
              floatField: Float!
              boolField: Boolean!
            }
          `,
          documentContent: `
            query MyQuery {
              idField
              stringField
              intField
              floatField
              boolField
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from enum', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            enum Color {
              RED
              BLUE
              GREEN
            }
            type Query {
              color: Color
            }
          `,
          documentContent: `
            query MyQuery {
              color
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from object type', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              hello: String!
            }
          `,
          documentContent: `
            query MyQuery {
              hello
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from interface type', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            interface Node {
              id: ID!
            }

            type Query {
              node: Node!
            }
          `,
          documentContent: `
            query MyQuery {
              node {
                id
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should throw error when direct selection on union type', () => {
        expect(() =>
          generateAstAndPrint({
            schemaSDL: `
            type User {
              id: ID!
              name: String!
            }
            type Page {
              id: ID!
              body: String!
            }
            union Item = User | Page
            type Query {
              item: Item!
            }
          `,
            documentContent: `
            query MyQuery {
              item {
                id
              }
            }
          `,
          }),
        ).toThrowError();
      });

      it('should gen type with correct list/nonNull modifiers', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              nullableField: String
              strictField: String!
              nullableFieldNullableList: [String]
              nullableFieldStrictList: [String]!
              strictFieldNullableList: [String!]
              strictFieldStrictList: [String!]!
            }
          `,
          documentContent: `
            query MyQuery {
              nullableField
              strictField
              nullableFieldNullableList
              nullableFieldStrictList
              strictFieldNullableList
              strictFieldStrictList
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });
    });

    describe('definition node pattern', () => {
      it('should gen type from query operation def', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              hello: String!
            }
          `,
          documentContent: `
            query {
              hello
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from mutation operation def', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Mutation {
              like(count: Int!): String!
            }
          `,
          documentContent: `
            mutation MyMutaion {
              like(count: 1)
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from subscription operation def', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Subscription {
              issue: String!
            }
          `,
          documentContent: `
            subscription MySubscription {
              issue
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from fragment def', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              hello: String
            }
          `,
          documentContent: `
            fragment MyFragment on Query {
              hello
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });
    });

    describe('fragment spread reference', () => {
      it('should gen type reference from fragment spread on operation', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              hello: String!
              bye: String!
            }
          `,
          documentContent: `
            fragment MyFragment on Query {
              hello
            }
            query MyQuery {
              bye
              ...MyFragment
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type reference from fragment spread on fragment def', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type User {
              name: String!
              age: Int!
            }
          `,
          documentContent: `
            fragment A on User {
              name
            }
            fragment B on User {
              ...A
              age
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type reference from fragment spread on field selection', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type User {
              id: ID!
              name: String!
              age: Int!
            }
            type Query {
              users: [User!]!
            }
          `,
          documentContent: `
            fragment MyFragment on User {
              name
              age
            }
            query MyQuery {
              users {
                id
                ...MyFragment
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from inline fragment without type condition', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              id: ID!
              hello: String!
            }
          `,
          documentContent: `
            query MyQuery {
              id
              ... {
                hello
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen type from inline fragment with type condition', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              id: ID!
              hello: String!
            }
          `,
          documentContent: `
            query MyQuery {
              id
              ... on Query {
                hello
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen union of type references from fragment concrete type condition', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            interface Node {
              id: ID!
            }
            type User implements Node {
              id: ID!
              name: String!
            }
            type Page implements Node {
              id: ID!
              body: String!
            }
            union Item = User | Page
            type Query {
              item: Item!
            }
          `,
          documentContent: `
            fragment NodeFragment on Node {
              id
            }
            fragment UserFragment on User {
              name
            }
            fragment PageFragment on Page {
              body
            }
            query MyQuery {
              item {
                ...UserFragment
                ...NodeFragment
                ...PageFragment
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen union object literal type from inline fragment concrete type condition', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            interface Node {
              id: ID!
            }
            type User implements Node {
              id: ID!
              name: String!
            }
            type Page implements Node {
              id: ID!
              body: String!
            }
            union Item = User | Page
            type Query {
              item: Item!
            }
          `,
          documentContent: `
            query MyQuery {
              item {
                ... on Node {
                  id
                }
                ... on User {
                  name
                }
                ... on Page {
                  body
                }
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });
    });

    describe('__typename field', () => {
      it('should gen __typename type from object type', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type Query {
              hello: String!
            }
          `,
          documentContent: `
            query MyQuery {
              __typename
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen __typename type from union type', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            type User {
              id: ID!
              name: String!
            }
            type Page {
              id: ID!
              body: String!
            }
            union Item = User | Page
            type Query {
              item: Item!
            }
          `,
          documentContent: `
            query MyQuery {
              item {
                __typename
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });

      it('should gen __typename type from interface type', () => {
        const result = generateAstAndPrint({
          schemaSDL: `
            interface Node {
              id: ID!
            }

            type Query {
              node: Node!
            }
          `,
          documentContent: `
            query MyQuery {
              node {
                __typename
              }
            }
          `,
        });
        expect(result).toMatchSnapshot();
      });
    });
  });
});
