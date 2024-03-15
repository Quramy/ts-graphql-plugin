# Extracted GraphQL Operations
## Queries

### AppQuery

```graphql
query AppQuery {
  popularPosts {
    id
    ...Post_Post
  }
}

fragment Post_Post on Post {
  title
  author {
    name
  }
}
```

From [src/App.tsx:24:24](src/App.tsx#L24-L31)
    
## Fragments

### Post_Post

```graphql
fragment Post_Post on Post {
  title
  author {
    name
  }
}
```

From [src/App.tsx:5:31](src/App.tsx#L5-L12)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)