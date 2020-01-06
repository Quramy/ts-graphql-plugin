import { SchemaManagerHost, SchemaConfig } from '../types';

export type CreateTestingSchemaManagerHostOptions = SchemaConfig & {
  prjRootPath?: string;
  files?: {
    fileName: string;
    content: string;
  }[];
};

export function createTestingSchemaManagerHost(config: CreateTestingSchemaManagerHostOptions): SchemaManagerHost {
  const files = config.files || [];
  return {
    getConfig() {
      return config;
    },
    getProjectRootPath() {
      return config.prjRootPath || '/';
    },
    readFile(path) {
      const found = files.find(f => f.fileName === path);
      if (found) return found.content;
    },
    fileExists(path) {
      return !!files.find(f => f.fileName === path);
    },
    watchFile() {
      return { close() {} };
    },
    log() {},
  };
}
