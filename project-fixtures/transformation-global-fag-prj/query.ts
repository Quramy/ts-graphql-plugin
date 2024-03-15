import gql from './tag';
import { fragmentNode } from './fragment-node';

const query = gql`
  query MyQuery {
    __typename
    ...FragmentNode
  }
`;

console.log(JSON.stringify(query, null, 2));
