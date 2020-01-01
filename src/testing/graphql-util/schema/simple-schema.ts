import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLString, introspectionQuery } from 'graphql';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'SimpleSchemaType',
    description: 'Simple schema type',
    fields: {
      hello: {
        type: GraphQLString,
      },
    },
  }),
});

export function createSimpleSchema(): Promise<any> {
  return graphql(schema, introspectionQuery);
}
