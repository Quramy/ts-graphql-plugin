import ts from 'typescript';
import { GraphQLSchema } from 'graphql';
import extract from 'fretted-strings';
import { AdapterFixture } from './testing/adapter-fixture';
import { createSimpleSchema } from './testing/simple-schema';
import { ERROR_CODES } from '../errors';

function craeteFixture(name: string, schema?: GraphQLSchema) {
  return new AdapterFixture(name, schema);
}

const defaultSemanticDigostics: ts.Diagnostic[] = [];

const delegateFn = () => defaultSemanticDigostics;

describe('getSemanticDiagnostics', () => {
  it('should delegate original fn when schema is not set', () => {
    const fixture = craeteFixture('input.ts');
    const actual = fixture.adapter.getSemanticDiagnostics(delegateFn, 'input.ts');
    expect(actual).toEqual(defaultSemanticDigostics);
  });

  it('should report errors coused by schema building', () => {
    const fixture = craeteFixture('input.ts');
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');
    fixture.adapter.updateSchema(
      [
        {
          fileName: 'schema.graphql',
          message: 'some schema build error',
          fileContent: '',
          locations: [{ line: 0, character: 0 }],
        },
      ],
      null,
    );
    fixture.source = 'const query = `query { hello }`;';
    const actual = validateFn();
    expect(actual[0].code).toBe(ERROR_CODES.schemaBuildError.code);
    expect(actual[0].messageText).toMatchSnapshot();
  });

  it('should return empty array for valid GraphQL template string', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const query = \`
        query {
          hello
        }
      \`;
    `;
    expect(validateFn()).toEqual([]);
  });

  it('should not report for empty template literal', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const query = \`\`;
    `;
    const actual = validateFn();
    expect(actual.length).toBe(0);
  });

  it('should return syntax error if template literal is not valid GraphQL syntax', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const query = \`query {\`;
    `;
    const actual = validateFn();
    expect(actual.length).toBe(1);
    expect((actual[0].messageText as string).match(/Syntax Error:/)).toBeTruthy();
  });

  it('should return position of error token', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    const [content, frets] = extract(
      // prettier-ignore
      '    const query = `query {`;    ' + '\n' +
      '%%%                      ^   %%%' + '\n' +
      '%%%                      a1  %%%' + '\n',
    );

    fixture.source = content;
    const actual = validateFn();
    expect(actual[0].start).toBe(frets.a1.pos);
  });

  it('should return diagnostic array for invalid GraphQL template string', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const query = \`
        query {
          hoge
        }
      \`;
    `;
    const [actual] = validateFn();
    const messageText = actual.messageText as string;
    expect(/Cannot query field "hoge"/.test(messageText)).toBeTruthy();
  });

  it('should filter severity of GraphQL errors', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const query = \`
        query {
          helloWorld
        }
      \`;
    `;
    expect(validateFn()[0].category).toBe(ts.DiagnosticCategory.Warning);

    fixture.source = `
      const query = \`
        query {
          helo
        }
      \`;
    `;
    expect(validateFn()[0].category).toBe(ts.DiagnosticCategory.Error);
  });

  it('should work with incomplete document', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      export const fragment = gql\`
        fragment MyFragment on Query {
          __typename

      \`;
    `;
    expect(validateFn().length).toBe(1);
  });

  it('should exclude fragment definition itself as external fragments', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.source = `
      const fragment = \`
        fragment MyFragment on Query {
          hello
        }
      \`;
    `;
    const actual = validateFn();
    expect(actual.length).toBe(0);
  });

  it('should work with external fragments', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture
      .registerFragment(
        'fragment1.ts',
        `
          fragment ExternalFragment1 on Query {
            __typename
          }
        `,
      )
      .registerFragment(
        'fragment2.ts',
        `
          fragment ExternalFragment2 on Query {
            __typename
          }
        `,
      ).source = `
        const fragment = \`
          fragment MyFragment on Query {
            hello
            ...ExternalFragment1
          }
        \`;
      `;
    const actual = validateFn();
    expect(actual.length).toBe(0);
  });

  it('should not report error if non-dependent fragment has error', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture
      .registerFragment(
        'fragment1.ts',
        `
          fragment DependentFragment on Query {
            __typename
          }
        `,
      )
      .registerFragment(
        'fragment2.ts',
        `
          fragment NonDependentFragment on Query {
            __typename
            notExistingFeild
          }
        `,
      ).source = `
        const fragment = \`
          fragment MyFragment on Query {
            hello
            ...DependentFragment
          }
        \`;
      `;
    const actual = validateFn();
    expect(actual.length).toBe(0);
  });

  it('should not report error even if dependent fragment has error', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.registerFragment(
      'fragment1.ts',
      `
        fragment DependentFragment on Query {
          __typename
          notExistingFeild
        }
      `,
    ).source = `
        const fragment = \`
          fragment MyFragment on Query {
            hello
            ...DependentFragment
          }
        \`;
      `;
    const actual = validateFn();
    expect(actual.length).toBe(0);
  });

  it('should return "templateIsTooComplex" error when template node has too complex interpolation', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    const [content, frets] = extract(
      `
      const query = \`
        \${someFn()}
   %%%  \\ ^          %%%
   %%%  \\ a1         %%%
        query {
          ...MyFragment
        }
      \`;
    `,
    );
    fixture.source = content;
    const actual = validateFn();
    expect(actual[0].code).toBe(ERROR_CODES.templateIsTooComplex.code);
    expect(actual[0].start).toBe(frets.a1.pos);
  });

  it('should return "isInOtherExpression" error when interpolated fragment has error', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    const [content, frets] = extract(
      `
      const fragment = \`
        fragment MyFragment on Query {
          hoge
        }
      \`;
      const query = \`
        \${fragment}
   %%%  \\ ^          %%%
   %%%  \\ a1         %%%
        query {
          ...MyFragment
        }
      \`;
    `,
    );
    fixture.source = content;
    const actual = validateFn();
    expect(actual.length).toBe(2);
    expect(actual[1].code).toBe(ERROR_CODES.errorInOtherInterpolation.code);
    expect(actual[1].start).toBe(frets.a1.pos);
  });

  it('should return "duplicatedFragmentDefinitions" error when interpolated fragment has error', () => {
    const fixture = craeteFixture('input.ts', createSimpleSchema());
    const validateFn = fixture.adapter.getSemanticDiagnostics.bind(fixture.adapter, delegateFn, 'input.ts');

    fixture.registerFragment(
      'fragments.ts',
      `
        fragment MyFragment on Query {
          __typename
        }
      `,
    );

    const [content, frets] = extract(
      `
        const fragment = \`
          fragment MyFragment on Query {
   %%%             ^         ^            %%%
   %%%             a1        a2           %%%
            __typename
          }
        \`;
      `,
    );
    fixture.source = content;
    const actual = validateFn();
    expect(actual.length).toBe(1);
    expect(actual[0].code).toBe(ERROR_CODES.duplicatedFragmentDefinitions.code);
    expect(actual[0].start).toBe(frets.a1.pos);
    expect(actual[0].length).toBe(frets.a2.pos - frets.a1.pos);
  });
});
