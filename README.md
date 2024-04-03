# ts-graphql-plugin

[![github actions](https://github.com/Quramy/ts-graphql-plugin/workflows/build/badge.svg)](https://github.com/Quramy/ts-graphql-plugin/actions)
[![codecov](https://codecov.io/gh/Quramy/ts-graphql-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/Quramy/ts-graphql-plugin)
[![npm version](https://badge.fury.io/js/ts-graphql-plugin.svg)](https://badge.fury.io/js/ts-graphql-plugin)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/main/LICENSE.txt)

Provides functions to help TypeScript GraphQL client development including auto completion, query validation, type generation and so on.

![VSCode screenshot](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/main/capture_v4.gif)

This plugin has the following features:

- As TypeScript Language Service extension:
  - Completion suggestion
  - Get GraphQL diagnostics
  - Go to fragment definition
  - Display GraphQL quick info within tooltip
- As CLI
  - Generate ts type files from your GraphQL operations in your TypeScript sources
  - Extract or validate GraphQL operations in your TypeScript sources
- As webpack plugin
  - Transform your queries to GraphQL AST object statically

## ToC

<!-- toc -->

- [Getting started](#getting-started)
- [CLI Usage](#cli-usage)
  - [`typegen` command](#typegen-command)
  - [`extract` command](#extract-command)
  - [`validate` command](#validate-command)
  - [`report` command](#report-command)
- [Plugin options](#plugin-options)
  - [`schema`](#schema)
  - [`tag`](#tag)
  - [`exclude`](#exclude)
  - [`enabledGlobalFragments`](#enabledglobalfragments)
  - [`localSchemaExtensions`](#localschemaextensions)
  - [`typegen.addons`](#typegenaddons)
- [Built-in Type Generator Addons](#built-in-type-generator-addons)
  - [`typed-query-document`](#typed-query-document)
- [webpack custom transformer](#webpack-custom-transformer)
  - [webpack plugin options](#webpack-plugin-options)
    - [`tsconfigPath` optional](#tsconfigpath-optional)
  - [Transformer options](#transformer-options)
    - [`removeFragmentDefinitions` optional](#removefragmentdefinitions-optional)
    - [`documentTransformers` optional](#documenttransformers-optional)
- [Available editors](#available-editors)
  - [VSCode](#vscode)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## Getting started

First, confirm that your project has TypeScript and graphql(v15.x.0 or later).

To install this plugin, execute the following:

```sh
npm install ts-graphql-plugin -D
```

And configure `plugins` section in your tsconfig.json, for example:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "path-or-url-to-your-schema.graphql"
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

Generate TypeScript types from GraphQL operations or fragments in your .ts source files. [Here is an output example](https://github.com/Quramy/ts-graphql-plugin/blob/main/project-fixtures/react-apollo-prj/src/__generated__/git-hub-query.ts).

### `extract` command

Extracts GraphQL operations and fragments from ts files and writes them to `manifest.json`.

### `validate` command

Validates your GraphQL operations and fragments in your ts files and report syntax or semantic errors.

### `report` command

Extracts GraphQL operations and fragments from ts files and report them to a Markdown file. [Here is an output example](https://github.com/Quramy/ts-graphql-plugin/blob/main/project-fixtures/react-apollo-prj/GRAPHQL_OPERATIONS.md).

## Plugin options

Pass plugin options to your tsconfig.json to configure this plugin.

```js
/* tsconfig.json */
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        /* plugin options */
        "schema": "path-or-url-to-your-schema.graphql",
        "exclude": ["__generated__"],
        ...
      }
    ]
  }
}
```

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

If you need to use more complex logic like fetch bearer token using client secret then you can build your http schema configuration using javascript. First, you need to setup your plugin configuration like below:

```json
  "schema": {
    "http": {
      "fromScript": "my-graphql-config.js"
    }
  },
```

Your script have to return valid `RequestSetup` or `Promise<RequestSetup>` object:

```ts
url: string;
method?: string; // default to 'POST'
headers?: { [key: string]: string };
```

Example how configuration script may look like:

```js
// my-graphql-config.js
module.exports = projectRootPath =>
  new Promise(resolve => {
    fetch('http://localhost/identity-server/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `client_secret=${process.env.MY_CLIENT_SECRET}`,
    })
      .then(response => response.json())
      .then(response => {
        resolve({
          url: 'http://localhost/graphql',
          method: 'POST', // unnecessary, "POST" is default value
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        });
      });
  });
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
        method?: string;
        headers?: { [key: string]: string };
      };
    }
  | {
      http: {
        fromScript: string;
      };
    };
```

### `tag`

It's optional and the default value is `["gql", "graphql"]`. This value is used to find template literal strings of GraphQL document in your sources.

For example:

```js
/* tsconfig.json */

{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "tag": "myGraphqlTag"
      }
    ]
  }
}
```

```ts
// Recognized as GraphQL document
const query1 = myGraphqlTag`
  query AppQuery {
    __typename
  }
`;
// Function call expression is also available.
const query2 = myGraphqlTag(`
  query AppQuery {
    __typename
  }
`);

// The followings are not recognized as GraphQL document:
const str3 = `<div></div>`;
const str4 = otherTagFn`foooo`;
const otherValue = otherFn(`foooo`);
```

The `tag` option accepts the following type:

```ts
type TagConfig =
  | undefined
  | string
  | string[]
  | {
      name?: string | string[];
      ignoreFunctionCallExpression?: boolean;
    };
```

> [!NOTE]
> The `ignoreFunctionCallExpression` key exists only for backward compatibility with old versions. You don't need to explicitly use this.

### `exclude`

It's optional. Specify an array of file or directory names when you want to exclude specific TypeScript sources from the plugin's analysis.

It's useful when other code generator copies your GraphQL document template strings.

```js
/* tsconfig.json */

{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "exclude": [
          "src/gql", // Ignore source files under `gql` directory
          "**/*.test.tsx" // Ignore test files
        ]
      }
    ]
  }
}
```

> [!TIP]
> Wildcard characters, `*`, `**`, and `?` are available.

> [!NOTE]
> The plugin processes only TypeScript sources in your project by default. You don't need list default excluded files(e.g. `node_modules`).

### `enabledGlobalFragments`

It's optional and the default value is `true`. If enabled, the plugin automatically searches for and merges the dependent fragments for the target GraphQL operation in the TypeScript project.

```tsx
/* Post.tsx */

import { graphql } from './gql';

const postFragment = graphql(`
  fragment PostFragment on Post {
    id
    name
    title
  }
`);

/* App.tsx */

const appQuery = graphql(`
  query AppQuery {
    posts {
      id
      ...PostFragment
    }
  }
`);
```

In the above example, note that `${postFragment}` is not in the `appQuery` template string literal.

If this option is set `true`, you can go to definition of the fragment from the location where the fragment is used as spread reference.

> [!IMPORTANT]
> This option does not depend on whether the query and fragment are combined at runtime.
> Whether or not query and fragment are eventually combined depends on the build toolchain you are using.
> For example, [graphql-codegen](https://the-guild.dev/graphql/codegen/docs/guides/react-vue#writing-graphql-fragments) and [Gatsby](https://www.gatsbyjs.com/docs/reference/graphql-data-layer/using-graphql-fragments/) have a mechanism for referencing global fragments.

> [!IMPORTANT]
> Fragments must be given a unique name if this option is enabled.

### `localSchemaExtensions`

It's optional. If you want to extend server-side schema, derived from `schema` option, you can set path of SDL file of your local extension.

For example:

```graphql
# local-extension.graphql

directive @client on FIELD

type SomeClientOnlyType {
  name: String!
}

extend type Query {
  someLocalField: SomeClientOnlyType!
}
```

```js
/* tsconfig.json */
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "base-schema.graphql",
        "localSchemaExtensions": ["local-extension.graphql"]
      }
    ]
  }
}
```

The above example setting allows to write the following query:

```ts
const query = gql`
  query {
    someLocalField @client {
      name
    }
  }
`;
```

### `typegen.addons`

It's optional. You can extend CLI's [`typegen` command](#typegen-command) with this option.

For example, the following configuration loads `my-addon.ts`, which is an Addon to map `URL` custom GraphQL scalar field to TypeScript string type.

```js
/* tsconfig.json */
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "schema.graphql",
        "typegen": {
          "addons": [
            "./my-addon"
          ]
        }
      }
    ]
  }
}
```

```ts
/* my-addon.ts */

import ts from 'typescript';
import { TypeGenAddonFactory } from 'ts-graphql-plguin';

const addonFactory: TypeGenAddonFactory = () => ({
  customScalar({ scalarType }) {
    if (scalarType.name === 'URL') {
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    }
  },
});

module.exports = addonFactory;
```

The `addons` property accepts an array of strings. And each string should point Node.js module which implements `TypeGenAddonFactory` interface. You can pass not only ".js" files but also ".ts" files.

If you learn how to create your Addon, see [type generator customization guide](docs/CUSTOMIZE_TYPE_GEN.md) for more details.

ts-graphql-plugin also provides built-in Addons. See also the [Built-in Type Generator Addons](#built-in-type-generator-addons) section.

## Built-in Type Generator Addons

### `typed-query-document`

This Addon requires `graphql` v15.4.0 or later. To enable this feature, configure as the following:

```js
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "tag": "gql",
        "schema": "schema.graphql",
        "typegen": {
          "addons": [
            "ts-graphql-plugin/addons/typed-query-document"
          ]
        }
      }
    ]
  }
}
```

When enabled generated files export a type based on [`TypedQueryDocumentNode`](https://the-guild.dev/blog/typed-document-node) from GraphQL. The type extends the standard `DocumentNode` AST type but also includes types for result data and variables as type arguments.

To use this feature you can apply a type assertion to `gql` template tag expressions that evaluate to a `DocumentNode` value.

For example:

```ts
const query = gql`
  query MyQuery($take: Int!) {
    recipes(take: $take) {
      id
      title
    }
  }
` as import('./__generated__/my-query.ts').MyQueryDocument;
```

With that type assertion in place result data and variable types will automatically flow through any function that accepts the `TypedQueryDocumentNode` type.

For example here is how you can write a wrapper for the `useQuery` function from Apollo Client:

```ts
import { gql, QueryHookOptions, QueryResult, useQuery } from '@apollo/client';
import { TypedQueryDocumentNode } from 'graphql';
function useTypedQuery<ResponseData, Variables>(
  query: TypedQueryDocumentNode<ResponseData, Variables>,
  options: QueryHookOptions<ResponseData, Variables>,
): QueryResult<ResponseData, Variables> {
  return useQuery(query, options);
}
// example usage
const { data } = useTypedQuery(query, { variables: { take: 100 } });
//      ^                                          ^
//      inferred type is `MyQuery`                 |
//                                                 |
//                                        inferred type is `MyQueryVariables`
```

The result is that generated types are associated with queries at the point where the query is defined instead of at the points where the query is executed.

## webpack custom transformer

ts-graphql-plugin provides TypeScript custom transformer to static transform from query template strings to GraphQL AST. It's useful if you use https://github.com/apollographql/graphql-tag

```js
/* webpack.config.js */
const TsGraphQLPlugin = require('ts-graphql-plugin/webpack');

const tsgqlPlugin = new TsGraphQLPlugin({
  /* plugin options */
});

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: () => ({
            before: [
              tsgqlPlugin.getTransformer({
                /* transformer options */
              }),
            ],
          }),
        },
      },
    ],
  },
  plugins: [tsgqlPlugin],
};
```

> [!NOTE]
> For now, this plugin transforms nothing when webpack's `--mode` option is `development` and webpack runs with `--watch` option.

### webpack plugin options

#### `tsconfigPath` optional

Set your project tsconfig json's file path. Default value: `tsconfig.json`.

### Transformer options

#### `removeFragmentDefinitions` optional

Default: `true`. If set, the transformer transforms template strings which include only GraphQL fragment definitions to empty string literal.

For example, we finally does not need the GraphQL AST document of `fragment`. We need interpolated GraphQL query AST for `query`. So this transformer statically resolves `${fragment}` interpolation and removes right-hand-side of the `fragment` variable.

```ts
const fragment = gql`
  fragment MyFragment on Query {
    hello
  }
`;

const query = gql`
  ${fragment}
  query MyQuery {
    ...MyFragment
  }
`;
```

#### `documentTransformers` optional

Default: `[]`. You can set an array of GraphQL AST document visitor functions. The visitor functions should be compatible to https://graphql.org/graphql-js/language/#visit .

## Available editors

I've checked the operation with the following editors:

- VSCode
- Vim (with tsuquyomi)

And the following editor have TypeScript plugin with LanguageService so they're compatible with this plugin:

- Emacs
- Sublime text
- Eclipse

### VSCode

To use TypeScript Language Service Plugin within VSCode, confirm your VSCode uses [workspace version TypeScript](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript).

```js
/* .vscode/setting.json */

{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Contributing

See [contribution guide](CONTRIBUTING.md).

## License

This software is released under the MIT License, see LICENSE.txt.
