import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter, ScriptSourceHelper } from './graphql-language-service-adapter';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
import { SchamaJsonManager } from './schema-json-manager';
import { findAllNodes, findNode } from './ts-util';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const getNode = (fileName: string, position: number) => {
    return findNode(info.languageService.getProgram().getSourceFile(fileName), position);
  };
  const getAllNodes = (fileName: string, cond: (n: ts.Node) => boolean) => {
    const s = info.languageService.getProgram().getSourceFile(fileName);
    return findAllNodes(s, cond);
  };
  const getLineAndChar = (fileName: string, position: number) => {
    const s = info.languageService.getProgram().getSourceFile(fileName);
    return ts.getLineAndCharacterOfPosition(s, position);
  };
  const schemaManager = new SchamaJsonManager(info);
  const helper: ScriptSourceHelper = {
    getNode,
    getAllNodes,
    getLineAndChar,
  };
  const schema = schemaManager.getSchema();
  const tag = info.config.tag;
  const logger = (msg: string) => info.project.projectService.logger.info(msg);
  const adapter = new GraphQLLanguageServiceAdapter(helper, { schema, logger, tag });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionAtPosition.bind(adapter, delegate))
    .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .build()
  ;

  schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
  schemaManager.startWatch();

  return proxy;
}

const moduleFactory: ts.server.PluginModuleFactory = (mod: { typescript: typeof ts }) => {
  return { create };
};

export default moduleFactory;
