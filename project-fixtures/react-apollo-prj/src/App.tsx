import { gql, useSuspenseQuery, useFragment } from '@apollo/client';

import { RepositoryItem } from './RepositoryItem';
import type { AppQueryDocument } from './__generated__/app-query';

const query = gql`
  query AppQuery($first: Int!) {
    viewer {
      repositories(first: $first) {
        nodes {
          id
          ...RepositoryItem_Repository @nonreactive
        }
      }
    }
  }
`;

const mutation = gql`
  mutation UpdateMyRepository($repositoryId: ID!) {
    updateRepository(input: { repositoryId: $repositoryId }) {
      clientMutationId
    }
  }
`;

export function App() {
  const { data } = useSuspenseQuery(query as AppQueryDocument, { variables: { first: 100 } });
  if (!data.viewer || !data.viewer.repositories.nodes) return null;
  return (
    <ul>
      {data.viewer.repositories.nodes.map(
        repository =>
          repository && (
            <li key={repository.id}>
              <RepositoryItem id={repository.id} />
            </li>
          ),
      )}
    </ul>
  );
}
