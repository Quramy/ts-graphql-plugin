import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLLanguageServiceAdapter } from "./graphql-language-service-adapter";
import { LanguageServiceProxyBuilder } from "./language-service-proxy-builder";
import { SchamaJsonManager } from "./schema-json-manager";

function findNode(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  function find(node: ts.Node): ts.Node|undefined {
    if (position >= node.getStart() && position < node.getEnd()) {
      return ts.forEachChild(node, find) || node;
    }
  }
  return find(sourceFile);
}

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const getNode = (fileName: string, position: number) => findNode(info.languageService.getProgram().getSourceFile(fileName), position);
  const logger = (msg: string) => info.project.projectService.logger.info(msg);
  const program = info.languageService.getProgram();

  const schemaManager = new SchamaJsonManager(info); 
  const schema = schemaManager.getSchema();
  const adapter = new GraphQLLanguageServiceAdapter(getNode, { schema, logger });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap("getCompletionsAtPosition", delegate => adapter.getCompletionInfo.bind(adapter, delegate))
    .build()
  ;

  schemaManager.registerOnChange(adapter.updateSchema.bind(adapter));
  schemaManager.startWatch();

  return proxy;
}

const moduleFactory: ts.server.PluginModuleFactory = function(mod: { typescript: typeof ts }) {
  return { create };
};

export = moduleFactory;
