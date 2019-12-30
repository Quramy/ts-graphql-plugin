import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter, ScriptSourceHelper } from './graphql-language-service-adapter';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
import { findAllNodes, findNode } from './ts-util';
import { SchemaManagerFactory } from './schema-manager/schema-manager-factory';
import { resolveTemplateExpression } from "./ts-util/resolve-template-expression";

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));
  const getSourceFile = (fileName: string) => {
    const program = info.languageService.getProgram();
    if (!program) {
      throw new Error();
    }
    const s = program.getSourceFile(fileName);
    if (!s) {
      throw new Error('no source file');
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
  const schemaManager = new SchemaManagerFactory(info).create();
  const helper: ScriptSourceHelper = {
    getNode,
    getAllNodes,
    getLineAndChar,
    resolveTemplateLiteral(fileName: string, node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression) {
      return resolveTemplateExpression({
        fileName: fileName,
        node,
        languageService: info.languageService,
      });
    },
  };
  const schema = schemaManager && schemaManager.getSchema();
  const tag = info.config.tag;
  const adapter = new GraphQLLanguageServiceAdapter(helper, { schema, logger, tag });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionAtPosition.bind(adapter, delegate))
    .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .build()
  ;

  if (schemaManager) {
    schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
    schemaManager.startWatch();
  }

  return proxy;
}

const moduleFactory: ts.server.PluginModuleFactory = (mod: { typescript: typeof ts }) => {
  return { create };
};

export default moduleFactory;
