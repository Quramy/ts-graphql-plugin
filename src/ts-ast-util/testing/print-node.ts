import ts from 'typescript';

let printer: ts.Printer | undefined = undefined;

export function printNode(node: ts.Node | undefined, hint?: ts.EmitHint) {
  if (!node) return '<UNDEFINED>';
  if (!printer) {
    printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
    });
  }
  const outSource = ts.createSourceFile('out.ts', '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return printer.printNode(hint ?? ts.EmitHint.Unspecified, node, outSource).trim();
}
