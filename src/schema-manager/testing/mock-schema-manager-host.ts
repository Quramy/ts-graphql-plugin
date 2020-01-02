import path from 'path';
import ts from 'typescript';
import { SchemaManagerHost, SchemaConfig } from '../types';

export function createMockSchemaManagerHost(config: SchemaConfig, rootPath?: string): SchemaManagerHost {
  return {
    getConfig() {
      return config;
    },
    getProjectRootPath() {
      if (rootPath) return rootPath;
      return path.resolve(__dirname, '../..');
    },
    readFile(path, encoding) {
      return ts.sys.readFile(path, encoding);
    },
    fileExists(path) {
      return ts.sys.fileExists(path);
    },
    watchFile(path, cb, interval) {
      return ts.sys.watchFile!(path, cb, interval);
    },
    log() {},
  };
}
