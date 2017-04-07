# ts-graphql-plugin [![wercker status](https://app.wercker.com/status/c2528abe2327a0b1dfa007225f2de471/s/master "wercker status")](https://app.wercker.com/project/byKey/c2528abe2327a0b1dfa007225f2de471) [![npm version](https://badge.fury.io/js/ts-graphql-plugin.svg)](https://badge.fury.io/js/ts-graphql-plugin) [![Greenkeeper badge](https://badges.greenkeeper.io/Quramy/ts-graphql-plugin.svg)](https://greenkeeper.io/)

**It's highly experimental!**

TypeScript Language Service Plugin to help GraphQL client(e.g. Apollo, Relay, etc...) development.
This plugin parses template strings in .ts files and analyzes syntax using graphql-language-service-interface.

![capture](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/capture.png)

## Features

This plugin extends TypeScript Language Service and provides the following features:

- Completion Suggestion

## Usage

First, confirm that your project has typescript(v2.3.x or later) and graphql.

To install this plugin, execute the following:

```sh
npm install ts-graphql-plugin -D
```

And configure `plugins` section of your tsconfig.json, for example:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "plugins": [
      { "name": "ts-graphql-plugin", "schema": "path-to-your-schema.json", "tag": "gql" }
    ]
  }
}
```

### Plugin options

#### `schema`
It's a required parameter and should point your GraphQL schema data.
You can generate it using `introspectionQuery`. If you want detail, see https://facebook.github.io/relay/docs/guides-babel-plugin.html#schema-json .

#### `tag`
It's optional. When it's set, this plugin works only if the target Template String is tagged by a function whose name is equal to this parameter.
For example:

```ts
// when tag paramter is 'gql'
const str1 = gql `query { }`;     // work
const str2 = `<div></div>`;       // don't work
const str3 = otherTagFn `foooo`;  // don't work
```

It's useful you write multiple kinds template strings(e.g. one is Angular Component Template, another is Apollo GraphQL query).

## License
This software is released under the MIT License, see LICENSE.txt.
