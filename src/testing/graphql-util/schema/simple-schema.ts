import { graphql, buildSchema } from 'graphql';

const schemaSDL = `
  type Query {
    hello: String!
  }
`;

export function createSimpleSchema() {
  return buildSchema(schemaSDL);
}
