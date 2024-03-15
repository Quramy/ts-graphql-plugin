import ts from 'typescript';
import { ScriptSourceHelper } from './types';
import { findAllNodes, findNode } from './utilily-functions';
import { TemplateExpressionResolver } from './template-expression-resolver';
import { createFileNameFilter } from './file-name-filter';

export function createScriptSourceHelper(
  {
    languageService,
    languageServiceHost,
    project,
  }: {
    languageService: ts.LanguageService;
    languageServiceHost: ts.LanguageServiceHost;
    project: { getProjectName: () => string };
  },
  {
    exclude,
  }: {
    exclude: string[] | undefined;
  },
): ScriptSourceHelper {
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
  const isExcluded = createFileNameFilter({ specs: exclude, projectName: project.getProjectName() });
  const getNode = (fileName: string, position: number) => {
    return findNode(getSourceFile(fileName), position);
  };
  const getAllNodes = <S extends ts.Node>(fileName: string, cond: (n: ts.Node) => undefined | boolean | S) => {
    const s = getSourceFile(fileName);
    return findAllNodes(s, cond);
  };
  const getLineAndChar = (fileName: string, position: number) => {
    const s = getSourceFile(fileName);
    return ts.getLineAndCharacterOfPosition(s, position);
  };
  const resolver = new TemplateExpressionResolver(
    languageService,
    (fileName: string) => languageServiceHost.getScriptVersion(fileName),
    isExcluded,
  );
  const resolveTemplateLiteral = resolver.resolve.bind(resolver);
  const updateTemplateLiteralInfo = resolver.update.bind(resolver);
  return {
    isExcluded,
    getNode,
    getAllNodes,
    getLineAndChar,
    resolveTemplateLiteral,
    updateTemplateLiteralInfo,
  };
}
