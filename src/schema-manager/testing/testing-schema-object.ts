import { graphqlSync, GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

const testingSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        resolve() {
          return 'world';
        },
      },
    },
  }),
});

export function executeTestingSchema({
  query,
  variables,
}: {
  readonly query: string;
  readonly variables: Record<string, unknown>;
}) {
  return graphqlSync({
    schema: testingSchema,
    source: query,
    variableValues: variables,
  });
}
