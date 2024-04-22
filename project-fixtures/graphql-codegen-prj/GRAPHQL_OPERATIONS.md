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
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)