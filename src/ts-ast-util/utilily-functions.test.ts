import ts from 'typescript';
import { findAllNodes, findNode, isTagged, isImportDeclarationWithCondition } from './utilily-functions';

describe(isTagged, () => {
  it('should return true when the tag condition is matched', () => {
    // prettier-ignore
    const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
    const node = findNode(s, text.length - 3) as ts.Node;
    expect(isTagged(node, 'myTag')).toBeTruthy();
  });

  it('should return true when the tag condition is not matched', () => {
    // prettier-ignore
    const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
    const node = findNode(s, text.length - 3) as ts.Node;
    expect(isTagged(node, 'MyTag')).toBeFalsy();
  });
});

describe(findAllNodes, () => {
  it('findAllNodes should return nodes which match given condition', () => {
    // prettier-ignore
    const text = 'const a = `AAA`;' + '\n'
             + 'const b = `BBB`;';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
    const actual = findAllNodes(s, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
    expect(actual.length).toBe(2);
    expect(actual.map(n => n.getText())).toEqual(['`AAA`', '`BBB`']);
  });
});

describe(isImportDeclarationWithCondition, () => {
  it('should return false when node is not importDeclaration', () => {
    const text = `export default hoge;`;
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
    expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'hoge', name: 'foo' })).toBeFalsy();
  });

  it('should return false when name nor from query are not specified', () => {
    const text = `import hoge from 'foo'`;
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
    expect(isImportDeclarationWithCondition(s.statements[0]!, {})).toBeFalsy();
  });

  describe('from query', () => {
    it('should return true when from query matches specifier', () => {
      const text = `import 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'graphql-tag' })).toBeTruthy();
    });

    it('should return false when from query does not match specifier', () => {
      const text = `import 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'graphql' })).toBeFalsy();
    });
  });

  describe('name query', () => {
    describe('isDefault is not specified', () => {
      it('should return true when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });

      it('should return true when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });

      it('should return true when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });
    });

    describe('isDefault is true', () => {
      it('should return true when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeTruthy();
      });

      it('should return false when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeFalsy();
      });

      it('should return false when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeFalsy();
      });
    });

    describe('isDefault is false', () => {
      it('should return false when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeFalsy();
      });

      it('should return true when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeTruthy();
      });

      it('should return true when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeTruthy();
      });
    });
  });
  describe('name and from query', () => {
    it('should return true when both name and from query match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', from: 'graphql-tag' })).toBeTruthy();
    });

    it('should return false when name matches but from does not match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', from: 'graphql' })).toBeFalsy();
    });

    it('should return false when from matches but name does not match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ESNext, true);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gqll', from: 'graphql-tag' })).toBeFalsy();
    });
  });
});
