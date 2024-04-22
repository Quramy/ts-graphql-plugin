import { graphql, useFragment, type FragmentType } from './gql';

import { UserAvatar } from './UserAvatar';

const fragment = graphql(`
  fragment PostSummary_Post on Post {
    id
    title
    author {
      name
      ...UserAvatar_User
    }
  }
`);

export function PostSummary(props: { post: FragmentType<typeof fragment> }) {
  const post = useFragment(fragment, props.post);
  return (
    <>
      <a href={`/posts/${post.id}`}>{post.title}</a>
      written by <span>{post.author.name}</span> <UserAvatar user={post.author} />
    </>
  );
}
