import ts from 'typescript/lib/tsserverlibrary';
import type { TsGraphQLPluginConfigOptions } from '../types';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';
import { SchemaManagerFactory, createSchemaManagerHostFromLSPluginInfo } from '../schema-manager';
import { FragmentRegistry } from '../gql-ast-util';
import {
  createScriptSourceHelper,
  registerDocumentChangeEvent,
  getTemplateNodeUnder,
  findAllNodes,
  getSanitizedTemplateText,
  createFileNameFilter,
  parseTagConfig,
} from '../ts-ast-util';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));
  const schemaManager = new SchemaManagerFactory(createSchemaManagerHostFromLSPluginInfo(info)).create();
  const { schema, errors: schemaErrors } = schemaManager.getSchema();
  const config = info.config as TsGraphQLPluginConfigOptions;
  const tag = parseTagConfig(config.tag);
  const removeDuplicatedFragments = config.removeDuplicatedFragments === false ? false : true;
  const enabledGlobalFragments = config.enabledGlobalFragments === true;
  const isExcluded = createFileNameFilter({ specs: config.exclude, projectName: info.project.getProjectName() });

  const fragmentRegistry = new FragmentRegistry({ logger });
  if (enabledGlobalFragments) {
    const handleAcquireOrUpdate = (fileName: string, sourceFile: ts.SourceFile, version: string) => {
      fragmentRegistry.registerDocuments(
        fileName,
        version,
        findAllNodes(sourceFile, node => getTemplateNodeUnder(node, tag)).map(node =>
          getSanitizedTemplateText(node, sourceFile),
        ),
      );
    };

    registerDocumentChangeEvent(
      // Note:
      // documentRegistry in ts.server.Project is annotated @internal
      (info.project as any).documentRegistry as ts.DocumentRegistry,
      {
        onAcquire: (fileName, sourceFile, version) => {
          if (!isExcluded(fileName) && info.languageServiceHost.getScriptFileNames().includes(fileName)) {
            handleAcquireOrUpdate(fileName, sourceFile, version);
          }
        },
        onUpdate: (fileName, sourceFile, version) => {
          if (!isExcluded(fileName) && info.languageServiceHost.getScriptFileNames().includes(fileName)) {
            if (fragmentRegistry.getFileCurrentVersion(fileName) === version) return;
            handleAcquireOrUpdate(fileName, sourceFile, version);
          }
        },
        onRelease: fileName => {
          fragmentRegistry.removeDocument(fileName);
        },
      },
    );
  }

  const scriptSourceHelper = createScriptSourceHelper(info, { exclude: config.exclude });
  const adapter = new GraphQLLanguageServiceAdapter(scriptSourceHelper, {
    schema,
    schemaErrors,
    logger,
    tag,
    fragmentRegistry,
    removeDuplicatedFragments,
  });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionAtPosition.bind(adapter, delegate))
    .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .wrap('getQuickInfoAtPosition', delegate => adapter.getQuickInfoAtPosition.bind(adapter, delegate))
    .wrap('getDefinitionAndBoundSpan', delegate => adapter.getDefinitionAndBoundSpan.bind(adapter, delegate))
    .wrap('getDefinitionAtPosition', delegate => adapter.getDefinitionAtPosition.bind(adapter, delegate))
    .build();

  schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
  schemaManager.start();

  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = () => {
  return { create };
};
