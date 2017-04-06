# ts-graphql-plugin [![wercker status](https://app.wercker.com/status/c2528abe2327a0b1dfa007225f2de471/s/master "wercker status")](https://app.wercker.com/project/byKey/c2528abe2327a0b1dfa007225f2de471) [![npm version](https://badge.fury.io/js/ts-graphql-plugin.svg)](https://badge.fury.io/js/ts-graphql-plugin)

[![Greenkeeper badge](https://badges.greenkeeper.io/Quramy/ts-graphql-plugin.svg)](https://greenkeeper.io/)

**It's highly experimental!**

TypeScript Language Service Plugin to help GraphQL client(e.g. Apollo, Relay, etc...) development.
This plugin parses template strings in .ts files and analyzes syntax using graphql-language-service-interface.

![capture](capture.png)

## Features

This plugin extends TypeScript Language Service and provides the following features:

- Completion Suggestion

## Usage

```sh
npm install ts-graphql-plugin -D
```

Configure `plugins` section of your tsconfig.json, for example:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "plugins": [
      { "name": "ts-graphql-plugin", "schema": "path-to-your-schema.json" }
    ]
  }
}
```

This plugin requires a parameter, which is `schema`. It should point your GraphQL schema data.
You can generate it using `introspectionQuery`. If you want detail, see https://facebook.github.io/relay/docs/guides-babel-plugin.html#schema-json .

## License
This software is released under the MIT License, see LICENSE.txt.
