# Extracted GraphQL Operations
## Queries

### GitHubQuery

```graphql
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

fragment RepositoryFragment on Repository {
  description
}
```

From [src/index.tsx:11:19](src/index.tsx#L11-L22)
    
## Mutations

### UpdateMyRepository

```graphql
mutation UpdateMyRepository($repositoryId: ID!) {
  updateRepository(input: {repositoryId: $repositoryId}) {
    clientMutationId
  }
}
```

From [src/index.tsx:24:22](src/index.tsx#L24-L30)
    
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