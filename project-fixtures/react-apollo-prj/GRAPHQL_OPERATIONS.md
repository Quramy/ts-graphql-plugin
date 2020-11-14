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

From [src/index.tsx:11:19](src/index.tsx#L11-L23)
    
## Fragments

### RepositoryFragment

```graphql
fragment RepositoryFragment on Repository {
  description
}
```

From [src/index.tsx:5:32](src/index.tsx#L5-L9)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)