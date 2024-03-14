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
    
## Mutations

### UpdateMyRepository

```graphql
mutation UpdateMyRepository($repositoryId: ID!) {
  updateRepository(input: {repositoryId: $repositoryId}) {
    clientMutationId
  }
}
```

From [src/index.tsx:25:22](src/index.tsx#L25-L31)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)