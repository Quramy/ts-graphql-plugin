import gql from 'graphql-tag';
import { fragmentNode } from './fragment-node';

export const query = gql`
  ${fragmentNode}
  query MyQuery {
    __typename
    ...FragmentNode
  }
`;

console.log(JSON.stringify(query, null, 2));
