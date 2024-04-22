import { useSuspenseQuery } from '@apollo/client';
import { graphql } from './gql';

import { PostSummary } from './PostSummary';

const query = graphql(`
  query PopularPosts_Query {
    popularPosts {
      id
      ...PostSummary_Post
    }
  }
`);

export function PopularPosts() {
  const { data } = useSuspenseQuery(query);
  return (
    <ul>
      {data.popularPosts.map(post => (
        <li key={post.id}>
          <PostSummary post={post} />
        </li>
      ))}
    </ul>
  );
}
