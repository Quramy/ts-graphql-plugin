import ts from 'typescript';
import {
  findAllNodes,
  findNode,
  isTagged,
  isImportDeclarationWithCondition,
  mergeImportDeclarationsWithSameModules,
  removeAliasFromImportDeclaration,
} from './utilily-functions';
import { printNode } from './testing/print-node';

describe(isTagged, () => {
  it('should return true when the tag condition is matched', () => {
    // prettier-ignore
    const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest, true);
    const node = findNode(s, text.length - 3) as ts.Node;
    expect(isTagged(node, 'myTag')).toBeTruthy();
  });

  it('should return true when the tag condition is not matched', () => {
    // prettier-ignore
    const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest, true);
    const node = findNode(s, text.length - 3) as ts.Node;
    expect(isTagged(node, 'MyTag')).toBeFalsy();
  });
});

describe(findAllNodes, () => {
  it('findAllNodes should return nodes which match given condition', () => {
    // prettier-ignore
    const text = 'const a = `AAA`;' + '\n'
             + 'const b = `BBB`;';
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest, true);
    const actual = findAllNodes(s, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
    expect(actual.length).toBe(2);
    expect(actual.map(n => n.getText())).toEqual(['`AAA`', '`BBB`']);
  });
});

describe(isImportDeclarationWithCondition, () => {
  it('should return false when node is not importDeclaration', () => {
    const text = `export default hoge;`;
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
    expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'hoge', name: 'foo' })).toBeFalsy();
  });

  it('should return false when name nor from query are not specified', () => {
    const text = `import hoge from 'foo'`;
    const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
    expect(isImportDeclarationWithCondition(s.statements[0]!, {})).toBeFalsy();
  });

  describe('from query', () => {
    it('should return true when from query matches specifier', () => {
      const text = `import 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'graphql-tag' })).toBeTruthy();
    });

    it('should return false when from query does not match specifier', () => {
      const text = `import 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { from: 'graphql' })).toBeFalsy();
    });
  });

  describe('name query', () => {
    describe('isDefault is not specified', () => {
      it('should return true when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });

      it('should return true when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });

      it('should return true when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql' })).toBeTruthy();
      });
    });

    describe('isDefault is true', () => {
      it('should return true when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeTruthy();
      });

      it('should return false when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeFalsy();
      });

      it('should return false when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: true })).toBeFalsy();
      });
    });

    describe('isDefault is false', () => {
      it('should return false when name query matches default imported identifier', () => {
        const text = `import gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeFalsy();
      });

      it('should return true when name query matches named imported identifier', () => {
        const text = `import { gql } from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeTruthy();
      });

      it('should return true when name query matches "import * as" syntax', () => {
        const text = `import * as gql from 'graphql-tag';`;
        const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
        expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', isDefault: false })).toBeTruthy();
      });
    });
  });
  describe('name and from query', () => {
    it('should return true when both name and from query match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', from: 'graphql-tag' })).toBeTruthy();
    });

    it('should return false when name matches but from does not match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gql', from: 'graphql' })).toBeFalsy();
    });

    it('should return false when from matches but name does not match', () => {
      const text = `import { gql } from 'graphql-tag';`;
      const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
      expect(isImportDeclarationWithCondition(s.statements[0]!, { name: 'gqll', from: 'graphql-tag' })).toBeFalsy();
    });
  });
});

describe(mergeImportDeclarationsWithSameModules, () => {
  function mergeFromImportStatements(text: string) {
    const inputSource = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
    const statements = inputSource.statements as ts.NodeArray<ts.ImportDeclaration>;
    return printNode(mergeImportDeclarationsWithSameModules(statements[0], statements[1]));
  }

  it('should return base import when module specifiers are not same', () => {
    const text = `
      import { Hoge } from "./hoge";
      import { Foo } from "./foo";
    `;
    expect(mergeFromImportStatements(text)).toBe('import { Hoge } from "./hoge";');
  });

  it('should return base import when module specifiers are not string literal', () => {
    const text = `
      import { Hoge } from 100;
      import { Foo } from 100;
    `;
    expect(mergeFromImportStatements(text)).toBe('import { Hoge } from 100;');
  });

  describe('when module specifiers are same', () => {
    it('should return base import when one is name space import', () => {
      const text = `
      import * as Hoge "./hoge";
      import { Foo } "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import * as Hoge from "./hoge";');
    });

    it('should shirink 2 imports without import clauses', () => {
      const text = `
      import "./hoge";
      import "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import "./hoge";');
    });

    it('should merge named import into no clause import', () => {
      const text = `
      import "./hoge";
      import { Foo } from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import { Foo } from "./hoge";');
    });

    it('should merge no clause import into named import', () => {
      const text = `
      import { Foo } from "./hoge";
      import "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import { Foo } from "./hoge";');
    });

    it('should merge default import into no clause import', () => {
      const text = `
      import "./hoge";
      import Foo from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import Foo from "./hoge";');
    });

    it('should merge no clause import into default import', () => {
      const text = `
      import Foo from "./hoge";
      import "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import Foo from "./hoge";');
    });

    it('should merge 2 named imports', () => {
      const text = `
      import { Hoge } from "./hoge";
      import { Foo } from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import { Hoge, Foo } from "./hoge";');
    });

    it('should merge 2 named type imports', () => {
      const text = `
      import type { Hoge } from "./hoge";
      import type { Foo } from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import type { Hoge, Foo } from "./hoge";');
    });

    it('should merge named imports when one is typed and another is not', () => {
      const text = `
      import { Hoge } from "./hoge";
      import type { Foo } from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import { Hoge, Foo } from "./hoge";');
    });

    it('should merge named import into default import', () => {
      const text = `
      import Hoge from "./hoge";
      import { Foo } from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import Hoge, { Foo } from "./hoge";');
    });

    it('should merge default import into named import', () => {
      const text = `
      import { Foo } from "./hoge";
      import Hoge from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import Hoge, { Foo } from "./hoge";');
    });

    it('should override 2 default imports', () => {
      const text = `
      import Foo from "./hoge";
      import Hoge from "./hoge";
    `;
      expect(mergeFromImportStatements(text)).toBe('import Hoge from "./hoge";');
    });
  });
});

describe(removeAliasFromImportDeclaration, () => {
  function remove(text: string, name: string) {
    const inputSource = ts.createSourceFile('input.ts', text, ts.ScriptTarget.Latest);
    const statements = inputSource.statements as ts.NodeArray<ts.ImportDeclaration>;
    const out = removeAliasFromImportDeclaration(statements[0], name);
    if (!out) return undefined;
    return printNode(removeAliasFromImportDeclaration(statements[0], name)).trim();
  }

  it('should return base statement when name does not match', () => {
    const text = `import Hoge, { Foo, Bar as BarBar } from "./hoge";`;
    expect(remove(text, 'Bar')).toBe(text);
  });

  it('should return undefined when the statement has only default import and name matches', () => {
    const text = `import Hoge from "./hoge";`;
    expect(remove(text, 'Hoge')).toBeUndefined();
  });

  it('should return undefined when the statement has only one named import and name matches', () => {
    const text = `import { Hoge } from "./hoge";`;
    expect(remove(text, 'Hoge')).toBeUndefined();
  });

  it('should return base import when the statement is namespace import', () => {
    const text = `import * as Hoge from "./hoge";`;
    expect(remove(text, 'Hoge')).toBe(text);
  });

  it('should remove default import name when name matches this', () => {
    const text = `import Hoge, { Foo, Bar as BarBar } from "./hoge";`;
    expect(remove(text, 'Hoge')).toBe(`import { Foo, Bar as BarBar } from "./hoge";`);
  });

  it('should remove named import name when name matches this', () => {
    const text = `import Hoge, { Foo, Bar as BarBar } from "./hoge";`;
    expect(remove(text, 'BarBar')).toBe(`import Hoge, { Foo } from "./hoge";`);
  });

  it('should remove named bindings when the bindings includes only one element and name matches this', () => {
    const text = `import Hoge, { Foo } from "./hoge";`;
    expect(remove(text, 'Foo')).toBe(`import Hoge from "./hoge";`);
  });
});
