import gql from 'graphql-tag';

export const PostFragment = gql`
  fragment PostFragment on Post {
    title
    body
    publishedAt
    entryURL
    ogImageURL
  }
`;

export const query = gql`
  ${PostFragment}
  query MyQuery($search: String!) {
    user(search: $search) {
      id
      posts {
        id
        ...PostFragment
      }
    }
  }
`;
