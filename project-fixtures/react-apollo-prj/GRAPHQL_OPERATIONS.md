# Extracted GraphQL Operations
## Queries

### AppQuery

```graphql
query AppQuery($first: Int!) {
  viewer {
    repositories(first: $first) {
      nodes {
        id
        ...RepositoryItem_Repository @nonreactive
      }
    }
  }
}

fragment RepositoryItem_Repository on Repository {
  name
  description
}
```

From [src/App.tsx:6:19](src/App.tsx#L6-L17)
    
## Mutations

### UpdateMyRepository

```graphql
mutation UpdateMyRepository($repositoryId: ID!) {
  updateRepository(input: {repositoryId: $repositoryId}) {
    clientMutationId
  }
}
```

From [src/App.tsx:19:22](src/App.tsx#L19-L25)
    
## Fragments

### RepositoryItem_Repository

```graphql
fragment RepositoryItem_Repository on Repository {
  name
  description
}
```

From [src/RepositoryItem.tsx:4:53](src/RepositoryItem.tsx#L4-L9)
    
---
Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)