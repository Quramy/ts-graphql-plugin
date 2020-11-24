import ts from 'typescript/lib/tsserverlibrary';
import path from 'path';
import { SchemaManagerHost, SchemaConfig } from './types';
import { TsGraphQLPluginConfigOptions } from '../types';

class SystemSchemaManagerHost implements SchemaManagerHost {
  constructor(
    private readonly _pluginConfig: TsGraphQLPluginConfigOptions,
    private readonly _prjRootPath: string,
    private readonly _debug: (msg: string) => void,
  ) {}

  log(msg: string): void {
    return this._debug(msg);
  }
  watchFile(path: string, cb: (fileName: string) => void, interval: number): { close(): void } {
    return ts.sys.watchFile!(path, cb, interval);
  }
  readFile(path: string, encoding?: string | undefined): string | undefined {
    return ts.sys.readFile(path, encoding);
  }
  fileExists(path: string): boolean {
    return ts.sys.fileExists(path);
  }
  getConfig(): SchemaConfig {
    return this._pluginConfig;
  }
  getProjectRootPath(): string {
    return this._prjRootPath;
  }
}

export function createSchemaManagerHostFromTSGqlPluginConfig(
  pluginConfig: TsGraphQLPluginConfigOptions,
  prjRootPath: string,
  debug: (msg: string) => void = () => {},
) {
  return new SystemSchemaManagerHost(pluginConfig, prjRootPath, debug);
}

export function createSchemaManagerHostFromLSPluginInfo(info: ts.server.PluginCreateInfo): SchemaManagerHost {
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
