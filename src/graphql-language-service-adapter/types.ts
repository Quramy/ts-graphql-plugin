import ts from 'typescript';
import { GraphQLSchema } from 'graphql';
import { ScriptSourceHelper, ResolveResult } from '../ts-ast-util';
import { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';

export type GetCompletionAtPosition = ts.LanguageService['getCompletionsAtPosition'];
export type GetSemanticDiagnostics = ts.LanguageService['getSemanticDiagnostics'];
export type GetQuickInfoAtPosition = ts.LanguageService['getQuickInfoAtPosition'];

export interface AnalysisContext {
  debug(msg: string): void;
  getScriptSourceHelper(): ScriptSourceHelper;
  getSchema(): GraphQLSchema | null | undefined;
  getSchemaOrSchemaErrors(): [GraphQLSchema, null] | [null, SchemaBuildErrorInfo[]];
  findTemplateNode(
    fileName: string,
    position: number,
  ): ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | undefined;
  findTemplateNodes(fileName: string): (ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression)[];
  resolveTemplateInfo(fileName: string, node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ResolveResult;
}
