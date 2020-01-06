# ts-graphql-plugin

[![github actions](https://github.com/Quramy/ts-graphql-plugin/workflows/build/badge.svg)](https://github.com/Quramy/ts-graphql-plugin/actions) [![npm version](https://badge.fury.io/js/ts-graphql-plugin.svg)](https://badge.fury.io/js/ts-graphql-plugin) ![deps](https://david-dm.org/quramy/ts-graphql-plugin.svg) [![Greenkeeper badge](https://badges.greenkeeper.io/Quramy/ts-graphql-plugin.svg)](https://greenkeeper.io/) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/LICENSE.txt)

Provides functions to help TypeScript GraphQL client development including auto completion, query validation, type generation and so on.

![capture](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/capture.gif)

## Features

- As TypeScript Language Service extension:
  - Completion suggestion
  - Get GraphQL diagnostics
  - Display GraphQL quick info within tooltip
- As CLI
  - Generate ts type files from your GraphQL operations in your TypeScript sources
  - Extract or validate GraphQL operations in your TypeScript sources

## Getting started

First, confirm that your project has typescript(v2.3.x or later) and graphql.

To install this plugin, execute the following:

```sh
npm install ts-graphql-plugin -D
```

And configure `plugins` section in your tsconfig.json, for example:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "path-or-url-to-your-schema.graphql",
        "tag": "gql"
      }
    ]
  }
}
```

It's ready to go. Launch your TypeScript IDE.

## CLI Usage

```sh
$ npx ts-graphql-plugin <command> [options]
```

If you install this plugin, a short alias `tsgql` is also available instead of `ts-graphql-plugin`.

Available commands are `typegen`, `extract`, `validate` and `report`. If you want more detail, run`ts-graphql-plugin --help`or`ts-graphql-plugin <command> --help` in your console.

### `typegen` command

Generate TypeScript types from GraphQL operations or fragments in your .ts source files. [Here is an output example](https://github.com/Quramy/ts-graphql-plugin/blob/master/project-fixtures/react-apollo-prj/src/__generated__/git-hub-query.ts).

### `extract` command

Extracts GraphQL operations and fragments from ts files and writes them to `manifest.json`.

### `validate` command

Validates your GraphQL operations and fragments in your ts files and report syntax or semantic errors.

### `report` command

Extracts GraphQL operations and fragments from ts files and report them to a Markdown file. [Here is an output example](https://github.com/Quramy/ts-graphql-plugin/blob/master/project-fixtures/react-apollo-prj/GRAPHQL_OPERATIONS.md).

## Plugin options

### `schema`

It's a required parameter and should point your GraphQL schema SDL file such as :

```graphql
type Author {
  id: ID!
  firstName: String
  lastName: String
  posts: [Post]
}
type Post {
  id: ID!
  title: String
  author: Author
  votes: Int
}
type Query {
  posts: [Post]
  author(id: ID!): Author
}
```

Also you can use GraphQL introspection query result data such as:

```js
{
  "data": {
    "__schema": {
      "queryType": {
        "name": "Query"
      },
      "types": [
        {
          "kind": "OBJECT",
          "name": "Query",
          "description": null,
          "fields": [
            {
              "name": "viewer",
              :
```

You can pass URL and custom HTTP headers. It's useful to use an existing GraphQL server like [GitHub v4 API](https://developer.github.com/v4/). For example:

```json
  "schema": {
    "http": {
      "url": "https://api.github.com/graphql",
      "headers": {
        "Authorization": "Bearer YOUR_GITHUB_API_TOKEN"
      }
    }
  },
```

The `schema` option accepts the following type:

```ts
type SchemaConfig =
  | string
  | {
      file: {
        path: string;
      };
    }
  | {
      http: {
        url: string;
        headers?: { [key: string]: string };
      };
    };
```

### `tag`

It's optional. When it's set, this plugin works only if the target template string is tagged by a function whose name is equal to this parameter.

If not set, this plugin treats all template strings in your .ts as GraphQL query.

For example:

```ts
import gql from 'graphql-tag';

// when tag paramter is 'gql'
const str1 = gql`query { }`; // work
const str2 = `<div></div>`; // don't work
const str3 = otherTagFn`foooo`; // don't work
```

It's useful to write multiple kinds template strings(e.g. one is Angular Component template, another is Apollo GraphQL query).

### `localSchemaExtensions`

It's optional. If you want extend server-side schema, derived from `schema` option, you can set path of SDL file of your local extension.

For example:

```graphql
# local-extension.graphql

directive @myClientDirective on FIELD

type SomeClientOnlyType {
  name: String!
}

extend type Query {
  someLocalField: SomeClientOnlyType!
}
```

```js
/* tsconfig.json */

    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "base-schema.graphql",
        "localSchemaExtensions": ["local-extension.graphql"]
      }
    ]
```

## Template strings

This tool analyzes template string literals in .ts files such as:

```ts
const query = gql`
  query MyQuery = {
    viewer {
      id
      name
    }
  }
`;
```

_NOTE_

This tool cannot interpret queries containing too complex TypeScript expressions because it statically explores GraphQL queries.

```ts
/* It's ok */

const fragment = gql`
  fragment MyFragment on User {
    id
    name
  }
`;

const query = gql`
  ${fragment}
  query MyQuery {
    viewer {
      ...MyFragment
    }
  }
`;
```

```ts
/* Bad */

const query = gql`
  query MyQuery {
    ${someComplexFunction()}
  }
`;
```

Keep your queries static (see also https://blog.apollographql.com/5-benefits-of-static-graphql-queries-b7fa90b0b69a ).

## Available editors

I've checked the operation with the following editors:

- Visual Studio Code
- Vim (with tsuquyomi)

And the following editor have TypeScript plugin with LanguageService so they're compatible with this plugin:

- Emacs
- Sublime text
- Eclipse

## License

This software is released under the MIT License, see LICENSE.txt.
