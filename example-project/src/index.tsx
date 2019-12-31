import React from 'react';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';

const repositoryFragment = gql`
  fragment RepositoryFragment on Repository {
    description
  }
`;

const query = gql`
  ${repositoryFragment}
  query GitHubQuery($first: Int!) {
    viewer {
      repositories(first: $first) {
        nodes {
          id
          ...RepositoryFragment
        }
      }
    }
  }
`;

export default () => {
  const { data } = useQuery(query);
  if (!data) return null;
  return (
    <ul>
      {data.repositories.nodes.map((repo: { id: string; description: string }) => (
        <li key={repo.id}>
          <span>{repo.description}</span>
        </li>
      ))}
    </ul>
  );
};
