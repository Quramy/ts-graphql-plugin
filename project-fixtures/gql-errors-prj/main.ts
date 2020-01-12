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

const semanticErrorQUery = gql`
  query {
    helo
  }
`;

const semanticWarnQuery = gql`
  query {
    helloWorld
  }
`;
