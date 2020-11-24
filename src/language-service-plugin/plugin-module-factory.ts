import ts from 'typescript/lib/tsserverlibrary';
import { TsGraphQLPluginConfigOptions } from '../types';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
import { SchemaManagerFactory, createSchemaManagerHostFromLSPluginInfo } from '../schema-manager';
import { createScriptSourceHelper } from '../ts-ast-util';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));
  const schemaManager = new SchemaManagerFactory(createSchemaManagerHostFromLSPluginInfo(info)).create();
  const { schema, errors: schemaErrors } = schemaManager.getSchema();
  const config = info.config as TsGraphQLPluginConfigOptions;
  const tag = config.tag;
  const removeDuplicatedFragments = config.removeDuplicatedFragments === false ? false : true;
  const adapter = new GraphQLLanguageServiceAdapter(createScriptSourceHelper(info), {
    schema,
    schemaErrors,
    logger,
    tag,
    removeDuplicatedFragments,
  });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionAtPosition.bind(adapter, delegate))
    .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .wrap('getQuickInfoAtPosition', delegate => adapter.getQuickInfoAtPosition.bind(adapter, delegate))
    .build();

  schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
  schemaManager.start();

  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = () => {
  return { create };
};
