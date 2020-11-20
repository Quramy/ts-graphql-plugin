# Contribution

We're always welcome to issues / PRs :smile:

<!-- toc -->

- [Setup](#setup)
- [Code format](#code-format)
- [Testing](#testing)
  - [Unit testing](#unit-testing)
  - [E2E testing](#e2e-testing)
  - [Manual testing](#manual-testing)
    - [Language service plugin](#language-service-plugin)
    - [CLI](#cli)
- [Adding New Dependencies](#adding-new-dependencies)

<!-- tocstop -->

## Setup

1. Clone this repository

```sh
git clone https://github.com/Quramy/ts-graphql-plugin.git
cd ts-graphql-plugin
```

2. Install dependencies

```sh
yarn install --pure-lockfile
```

3. Compile TypeScript sources

```sh
yarn compile
```

## Code format

We use Prettier and configure to format sources automatically when they're git staged.

And we use ESLint.

```sh
yarn lint
```

## Testing

### Unit testing

If you add / modify some functions, write unit testing code about them.

Execute the following to run all unit testing codes:

```sh
yarn test
```

### E2E testing

In some cases, it's difficult to cover entire functions by unit testing. For example, we should assert "Our language service extension should react when text editor/IDE send a request". We should make sure the whole feature works together correctly.

In such cases, consider adding E2E test specs.

```sh
yarn compile
yarn e2e all
```

You can specify test suite name via:

```sh
yarn e2e cli # Execute only specs under e2e/cli-specs
```

### Manual testing

#### Language service plugin

You can check manually language service plugin features with our example project.

```sh
yarn compile
yarn link
cd project-fixtures/react-apollo-prj
yarn install
yarn link ts-graphql-plugin
code . # Or launch editor/IDE what you like
```

Of course, you can use other editor which communicates with tsserver .

#### CLI

You can run CLI using compiled `cli.js`. For example:

```
node lib/cli/cli.js validate -p project-fixtures/gql-errors-prj
```

## Adding New Dependencies

Not add new dependencies. ts-graphql-plugin is implemented for the purpose of being able to be installed by users in a short installation time.
