# Extracted GraphQL Operations
## Queries

### GitHubQuery

```graphql
fragment RepositoryFragment on Repository {
  description
}

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
```

From [src/index.tsx:12:19](src/index.tsx#L12-L24)
    
## Fragments

### RepositoryFragment

```graphql
fragment RepositoryFragment on Repository {
  description
}
```

From [src/index.tsx:6:32](src/index.tsx#L6-L10)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)