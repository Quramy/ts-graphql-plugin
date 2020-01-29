import gql from 'graphql-tag';

export const fragmentLeaf = gql`
  fragment FragmentLeaf on Query {
    hello
  }
`;
