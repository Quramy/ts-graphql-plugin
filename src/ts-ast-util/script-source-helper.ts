import ts from 'typescript';
import { ScriptSourceHelper } from './types';
import { findAllNodes, findNode } from './utilily-functions';
import { TemplateExpressionResolver } from './template-expression-resolver';

export function createScriptSourceHelper({
  languageService,
  languageServiceHost,
}: {
  languageService: ts.LanguageService;
  languageServiceHost: ts.LanguageServiceHost;
}): ScriptSourceHelper {
  const getSourceFile = (fileName: string) => {
    const program = languageService.getProgram();
    if (!program) {
      throw new Error('language service host does not have program!');
    }
    const s = program.getSourceFile(fileName);
    if (!s) {
      throw new Error('No source file: ' + fileName);
    }
    return s;
  };
  const getNode = (fileName: string, position: number) => {
    return findNode(getSourceFile(fileName), position);
  };
  const getAllNodes = (fileName: string, cond: (n: ts.Node) => boolean) => {
    const s = getSourceFile(fileName);
    return findAllNodes(s, cond);
  };
  const getLineAndChar = (fileName: string, position: number) => {
    const s = getSourceFile(fileName);
    return ts.getLineAndCharacterOfPosition(s, position);
  };
  const resolver = new TemplateExpressionResolver(languageService, (fileName: string) =>
    languageServiceHost.getScriptVersion(fileName),
  );
  const resolveTemplateLiteral = resolver.resolve.bind(resolver);
  const updateTemplateLiteralInfo = resolver.update.bind(resolver);
  return {
    getNode,
    getAllNodes,
    getLineAndChar,
    resolveTemplateLiteral,
    updateTemplateLiteralInfo,
  };
}
