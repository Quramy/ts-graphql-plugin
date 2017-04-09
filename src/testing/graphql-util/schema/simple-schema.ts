import * as GraphQL from 'graphql';

const schema = new GraphQL.GraphQLSchema({
  query: new GraphQL.GraphQLObjectType({
    name: 'SimpleSchemaType',
    description: 'Simple schema type',
    fields: {
      hello: {
        type: GraphQL.GraphQLString,
      },
    },
  }),
});

export function createSimpleSchema(): Promise<any> {
  return GraphQL.graphql(schema, GraphQL.introspectionQuery);
}
