# Extracted GraphQL Operations
## Queries

### PopularPosts_Query

```graphql
query PopularPosts_Query {
  popularPosts {
    id
    ...PostSummary_Post
  }
}

fragment PostSummary_Post on Post {
  id
  title
  author {
    name
    ...UserAvatar_User
  }
}

fragment UserAvatar_User on User {
  name
  avatarURL
}
```

From [src/PopularPosts.tsx:6:24](src/PopularPosts.tsx#L6-L13)
    
## Fragments

### PostSummary_Post

```graphql
fragment PostSummary_Post on Post {
  id
  title
  author {
    name
    ...UserAvatar_User
  }
}

fragment UserAvatar_User on User {
  name
  avatarURL
}
```

From [src/PostSummary.tsx:5:27](src/PostSummary.tsx#L5-L14)
    

### UserAvatar_User

```graphql
fragment UserAvatar_User on User {
  name
  avatarURL
}
```

From [src/UserAvatar.tsx:3:27](src/UserAvatar.tsx#L3-L8)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)