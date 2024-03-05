import ts from 'typescript/lib/tsserverlibrary';
import { TsGraphQLPluginConfigOptions } from '../types';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';
import { DocumentRegistryProxy } from './document-registry-proxy';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
import { SchemaManagerFactory, createSchemaManagerHostFromLSPluginInfo } from '../schema-manager';
import { FragmentRegistry } from '../gql-ast-util';
import { createScriptSourceHelper, isTagged, findAllNodes } from '../ts-ast-util';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));
  const schemaManager = new SchemaManagerFactory(createSchemaManagerHostFromLSPluginInfo(info)).create();
  const { schema, errors: schemaErrors } = schemaManager.getSchema();
  const config = info.config as TsGraphQLPluginConfigOptions;
  const tag = config.tag;
  const removeDuplicatedFragments = config.removeDuplicatedFragments === false ? false : true;

  const host = info.languageServiceHost;
  const docRegistry = new DocumentRegistryProxy({
    delegate: ts.createDocumentRegistry(
      host.useCaseSensitiveFileNames && host.useCaseSensitiveFileNames(),
      host.getCurrentDirectory(),
    ),
  });

  const languageService = ts.createLanguageService(info.languageServiceHost, docRegistry);
  const fragmentRegistry = new FragmentRegistry();
  const scriptSourceHelper = createScriptSourceHelper({ ...info, languageService });
  const adapter = new GraphQLLanguageServiceAdapter(scriptSourceHelper, {
    schema,
    schemaErrors,
    logger,
    tag,
    fragmentRegistry,
    removeDuplicatedFragments,
  });

  docRegistry.scriptChangeEventListener = {
    onAcquire: (fileName, sourceFile, version) => {
      if (host.getScriptFileNames().includes(fileName)) {
        // TODO remove before merge
        logger('acquire script ' + fileName + version);

        const templateLiteralNodes = findAllNodes(sourceFile, node => {
          // TODO handle TemplateExpression
          if (ts.isNoSubstitutionTemplateLiteral(node)) {
            return true;
          }
          if (!tag) return true;
          return !!isTagged(node, tag);
        }) as ts.NoSubstitutionTemplateLiteral[];
        fragmentRegistry.registerDocument(
          fileName,
          version,
          templateLiteralNodes.reduce((docs, node) => (node.rawText ? [...docs, node.rawText] : docs), [] as string[]),
        );
      }
    },
    onUpdate: (fileName, sourceFile, version) => {
      if (host.getScriptFileNames().includes(fileName)) {
        if (fragmentRegistry.getFileCurrentVersion(fileName) === version) return;
        // TODO remove before merge
        logger('update script ' + fileName + version);

        const templateLiteralNodes = findAllNodes(sourceFile, node => {
          // TODO handle TemplateExpression
          if (ts.isNoSubstitutionTemplateLiteral(node)) {
            return true;
          }
          if (!tag) return true;
          return !!isTagged(node, tag);
        }) as ts.NoSubstitutionTemplateLiteral[];
        fragmentRegistry.registerDocument(
          fileName,
          version,
          templateLiteralNodes.reduce((docs, node) => (node.rawText ? [...docs, node.rawText] : docs), [] as string[]),
        );
      }
    },
    onRelease: fileName => {
      fragmentRegistry.removeDocument(fileName);
    },
  };

  const proxy = new LanguageServiceProxyBuilder({ languageService })
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
