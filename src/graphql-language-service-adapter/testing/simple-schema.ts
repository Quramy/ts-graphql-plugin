import { buildSchema } from 'graphql';

const schemaSDL = `
  type Query {
    hello: String!
    helloWorld: String! @deprecated(reason: "Don't use")
  }
`;

export function createSimpleSchema() {
  return buildSchema(schemaSDL);
}
