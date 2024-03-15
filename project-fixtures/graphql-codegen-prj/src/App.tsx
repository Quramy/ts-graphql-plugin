import { useQuery } from '@apollo/client';

import { graphql, useFragment, type FragmentType } from './gql';

const postFragment = graphql(`
  fragment Post_Post on Post {
    title
    author {
      name
    }
  }
`);

function Post(props: { post: FragmentType<typeof postFragment> }) {
  const post = useFragment(postFragment, props.post);
  return (
    <div>
      <p>{post.title}</p>
      by <span>{post.author.name}</span>
    </div>
  );
}

const query = graphql(`
  query AppQuery {
    popularPosts {
      id
      ...Post_Post
    }
  }
`);

export default function App() {
  const { data } = useQuery(query);
  if (!data) return null;

  return (
    <main>
      <ul>
        {data.popularPosts.map(post => (
          <li key={post.id}>
            <Post post={post} />
          </li>
        ))}
      </ul>
    </main>
  );
}
