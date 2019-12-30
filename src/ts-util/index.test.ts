import * as ts from 'typescript/lib/tsserverlibrary';
import { findAllNodes, findNode, isTagged } from './';

it('isTagged should return true when the tag condition is matched', () => {
  const text = 'function myTag(...args: any[]) { return "" }' + '\n' + 'const x = myTag`query { }`';
  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const node = findNode(s, text.length - 3) as ts.Node;
  expect(isTagged(node, 'myTag')).toBeTruthy();
});

it('isTagged should return true when the tag condition is not matched', () => {
  const text = 'function myTag(...args: any[]) { return "" }' + '\n' + 'const x = myTag`query { }`';
  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const node = findNode(s, text.length - 3) as ts.Node;
  expect(isTagged(node, 'MyTag')).toBeFalsy();
});

it('findAllNodes should return nodes which match given condition', () => {
  const text = 'const a = `AAA`;' + '\n' + 'const b = `BBB`;';

  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const actual = findAllNodes(s, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
  expect(actual.length).toBe(2);
  expect(actual.map(n => n.getText())).toEqual(['`AAA`', '`BBB`']);
});
