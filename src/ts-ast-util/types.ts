import { ResolvedTemplateInfo } from '.';

export interface ScriptSourceHelper {
  getAllNodes: (fileName: string, condition: (n: ts.Node) => boolean) => ts.Node[];
  getNode: (fileName: string, position: number) => ts.Node | undefined;
  getLineAndChar: (fileName: string, position: number) => ts.LineAndCharacter;
  resolveTemplateLiteral: (
    fileName: string,
    node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression,
  ) => ResolvedTemplateInfo | undefined;
}
