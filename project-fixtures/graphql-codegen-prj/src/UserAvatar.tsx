import { graphql, useFragment, type FragmentType } from './gql';

const fragment = graphql(`
  fragment UserAvatar_User on User {
    name
    avatarURL
  }
`);

export function UserAvatar(props: { user: FragmentType<typeof fragment> }) {
  const user = useFragment(fragment, props.user);

  return <img src={user.avatarURL} alt={user.name} />;
}
