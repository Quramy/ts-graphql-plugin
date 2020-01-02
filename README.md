# ts-graphql-plugin

[![github actions](https://github.com/Quramy/ts-graphql-plugin/workflows/build/badge.svg)](https://github.com/Quramy/ts-graphql-plugin/actions) [![npm version](https://badge.fury.io/js/ts-graphql-plugin.svg)](https://badge.fury.io/js/ts-graphql-plugin) ![deps](https://david-dm.org/quramy/ts-graphql-plugin.svg) [![Greenkeeper badge](https://badges.greenkeeper.io/Quramy/ts-graphql-plugin.svg)](https://greenkeeper.io/) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/LICENSE.txt)

TypeScript Language Service Plugin to help GraphQL client development(e.g. [Apollo](https://github.com/apollographql/apollo-client)).
This plugin parses and analyzes template strings in .ts and provides functions like [GraphiQL](https://github.com/graphql/graphiql) to your editor or IDE.

![capture](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/capture.gif)

## Features

This plugin extends TypeScript Language Service and provides the following features:

- Completion suggestion
- Get GraphQL diagnostics
- Display GraphQL quick info within tooltip

## Usage

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

### Plugin options

#### `schema`

It's a required parameter and should point your GraphQL schema SDL file such as :

```graphql
type Author {
  id: Int!
  firstName: String
  lastName: String
  posts: [Post]
}
type Post {
  id: Int!
  title: String
  author: Author
  votes: Int
}
type Query {
  posts: [Post]
  author(id: Int!): Author
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

#### `tag`

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

#### `localSchemaExtensions`

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

## Available editors

I've checked the operation with the following editors:

- Visual Studio Code
- Vim (with tsuquyomi)

And the following editor have TypeScript plugin with LanguageService so they're compatible with this plugin:

- Emacs
- Sublime text
- Eclipse

## How it works

This plugin relies on [graphql-language-service](https://github.com/graphql/graphql-language-service) and adapts it for [TypeScript Language Service](https://github.com/Microsoft/TypeScript/wiki/Architectural-Overview#layer-overview).

## License

This software is released under the MIT License, see LICENSE.txt.
