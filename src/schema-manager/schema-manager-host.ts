import ts from 'typescript/lib/tsserverlibrary';
import path from 'path';
import { SchemaManagerHost, SchemaConfig } from './types';

export function createSchemaManagerHostFromPluginInfo(info: ts.server.PluginCreateInfo): SchemaManagerHost {
  return {
    getConfig() {
      return info.config as SchemaConfig;
    },
    fileExists(path) {
      return info.serverHost.fileExists(path);
    },
    readFile(path, encoding) {
      return info.serverHost.readFile(path, encoding);
    },
    watchFile(path, cb, interval) {
      return info.serverHost.watchFile(path, cb, interval);
    },
    getProjectRootPath() {
      return path.dirname(info.project.getProjectName());
    },
    log(msg) {
      info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
    },
  };
}
