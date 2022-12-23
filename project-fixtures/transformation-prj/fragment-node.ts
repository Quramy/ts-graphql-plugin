import gql from './tag';
import { fragmentLeaf } from './fragment-leaf';

export const fragmentNode = gql`
  ${fragmentLeaf}
  fragment FragmentNode on Query {
    bye
    ...FragmentLeaf
  }
`;
