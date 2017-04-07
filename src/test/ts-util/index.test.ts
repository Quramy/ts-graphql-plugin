import test from 'ava';
import * as ts from 'typescript/lib/tsserverlibrary';
import { findAllNodes, findNode, isTagged } from '../../lib/ts-util/index';

test('isTagged should return true when the tag condition is matched', t => {
  const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const node: ts.Node = findNode(s, text.length - 3);
  t.truthy(isTagged(node, 'myTag'));
});

test('isTagged should return true when the tag condition is not matched', t => {
  const text = 'function myTag(...args: any[]) { return "" }' + '\n'
             + 'const x = myTag`query { }`';
  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const node: ts.Node = findNode(s, text.length - 3);
  t.falsy(isTagged(node, 'MyTag'));
});

test('findAllNodes should return nodes which match given condition', t => {
  const text = 'const a = `AAA`;' + '\n'
             + 'const b = `BBB`;';

  const s = ts.createSourceFile('input.ts', text, ts.ScriptTarget.ES2015, true);
  const actual = findAllNodes(s, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
  t.is(actual.length, 2);
  t.deepEqual(actual.map(n => n.getText()), ['`AAA`', '`BBB`']);
});
