import gql from 'graphql-tag';

const getField = () => 'hello';

const syntaxErrorQuery = gql`
  querry {
    name
  }
`;

const tooComplexExpressionQuery = gql`
  query {
    ${getField()}
  }
`
const semanticErrorFragment = gql`
  fragment MyFragment  on Query {
    hoge
  }
`;

const duplicatedFragment = gql`
  fragment MyFragment on Query {
    hoge
  }
`;
