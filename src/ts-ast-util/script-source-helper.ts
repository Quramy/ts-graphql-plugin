import ts from '../tsmodule';
import { findAllNodes, findNode } from './utilily-functions';
import { TemplateExpressionResolver } from './template-expression-resolver';
import { createFileNameFilter } from './file-name-filter';
import type { ScriptSourceHelper } from './types';

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
    reuseProgram,
  }: {
    exclude: string[] | undefined;
    reuseProgram?: boolean;
  },
): ScriptSourceHelper {
  let cachedProgram: ts.Program | undefined;

  const getSourceFile = (fileName: string) => {
    // Note:
    // Reuse program in batching procedure(e.g. CLI) because getProgram() is "heavy" function.
    const program = cachedProgram ?? languageService.getProgram();
    if (!program) {
      throw new Error('language service host does not have program!');
    }
    if (reuseProgram) cachedProgram = program;
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
