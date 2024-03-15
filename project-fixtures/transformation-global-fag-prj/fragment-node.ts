import gql from './tag';

const fragmentNode = gql`
  fragment FragmentNode on Query {
    bye
    ...FragmentLeaf
  }
`;
