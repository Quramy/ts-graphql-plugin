import type ts from 'typescript';
import type { GraphQLSchema, DocumentNode, FragmentDefinitionNode } from 'graphql';
import type { ScriptSourceHelper, ResolveResult } from '../ts-ast-util';
import type { SchemaBuildErrorInfo } from '../schema-manager/schema-manager';

export type GetCompletionAtPosition = ts.LanguageService['getCompletionsAtPosition'];
export type GetSemanticDiagnostics = ts.LanguageService['getSemanticDiagnostics'];
export type GetQuickInfoAtPosition = ts.LanguageService['getQuickInfoAtPosition'];

export interface AnalysisContext {
  debug(msg: string): void;
  getScriptSourceHelper(): ScriptSourceHelper;
  getSchema(): GraphQLSchema | null | undefined;
  getSchemaOrSchemaErrors(): [GraphQLSchema, null] | [null, SchemaBuildErrorInfo[]];
  getGlobalFragmentDefinitions(): FragmentDefinitionNode[];
  getExternalFragmentDefinitions(
    documentStr: string,
    fileName: string,
    sourcePosition: number,
  ): FragmentDefinitionNode[];
  getDuplicaterdFragmentDefinitions(): Set<string>;
  getGraphQLDocumentNode(text: string): DocumentNode | undefined;
  findAscendantTemplateNode(
    fileName: string,
    position: number,
  ): ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | undefined;
  findTemplateNodes(fileName: string): (ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression)[];
  resolveTemplateInfo(fileName: string, node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ResolveResult;
}
