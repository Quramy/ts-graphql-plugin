# Contribution

We're always welcome to issues / PRs :smile:

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

In some cases, it's difficult to cover entire functions by unit testing. For example, we should assert "Out language service extension should react when text editor/IDE send a request". We should make sure the whole feature works together correctly.

In such cases, consider adding E2E test specs.

```
yarn compile
yarn e2e
```

### Manual testing

#### Language service plugin

```sh
yarn compile
yarn link
cd project-fixtures/react-apollo-prj
yarn install
yarn link ts-graphql-plugin
code .
```

#### CLI

You can run CLI using compiled `cli.js`. For example:

```
node lib/cli/cli.js validate -p project-fixtures/gql-errors-prj
```

## Adding New Dependencies

Not add new dependencies. ts-graphql-plugin is implemented for the purpose of being able to be installed by users in a short installation time.
