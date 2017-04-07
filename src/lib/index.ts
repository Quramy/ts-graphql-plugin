import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter } from './graphql-language-service-adapter';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
import { SchamaJsonManager } from './schema-json-manager';
import { findNode } from './ts-util';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const getNode = (fileName: string, position: number) => {
    return findNode(info.languageService.getProgram().getSourceFile(fileName), position);
  };
  const logger = (msg: string) => info.project.projectService.logger.info(msg);
  const schemaManager = new SchamaJsonManager(info);
  const schema = schemaManager.getSchema();
  const adapter = new GraphQLLanguageServiceAdapter(getNode, { schema, logger });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionPosition.bind(adapter, delegate))
    .build()
  ;

  schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
  schemaManager.startWatch();

  return proxy;
}

export const moduleFactory: ts.server.PluginModuleFactory = (mod: { typescript: typeof ts }) => {
  return { create };
};
