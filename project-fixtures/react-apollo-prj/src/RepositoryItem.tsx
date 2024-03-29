import { gql, useFragment } from '@apollo/client';
import type { RepositoryItem_Repository } from './__generated__/repository-item-repository';

export const repositoryItemRepositoryDocument = gql`
  fragment RepositoryItem_Repository on Repository {
    name
    description
  }
`;

export function RepositoryItem({ id }: { id: string }) {
  const { complete, data } = useFragment<RepositoryItem_Repository>({
    fragment: repositoryItemRepositoryDocument,
    from: {
      __typename: 'Repository',
      id,
    },
  });
  if (!complete) return;
  return (
    <div>
      <header>{data.name}</header>
      <span>{data.description}</span>
    </div>
  );
}
