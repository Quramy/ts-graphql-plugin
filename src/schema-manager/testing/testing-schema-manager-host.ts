import { SchemaManagerHost, SchemaConfig } from '../types';

export type CreateTestingSchemaManagerHostOptions = SchemaConfig & {
  prjRootPath?: string;
  files?: {
    fileName: string;
    content: string;
  }[];
  log?: (msg: string) => void;
};

class TestingSchemaManagerHost implements SchemaManagerHost {
  private _files: { fileName: string; content: string }[];

  private _watchers: { path: string; cb: (fileName: string) => void }[] = [];

  constructor(private _config: CreateTestingSchemaManagerHostOptions) {
    this._files = _config.files || [];
  }

  getConfig() {
    return this._config;
  }

  getProjectRootPath() {
    return this._config.prjRootPath || '/';
  }

  readFile(path: string) {
    const found = this._files.find(f => f.fileName === path);
    if (found) return found.content;
  }

  fileExists(path: string) {
    return !!this._files.find(f => f.fileName === path);
  }

  watchFile(path: string, cb: (fileName: string) => void) {
    this._watchers.push({ path, cb });
    return { close() {} };
  }

  log(msg: string) {
    if (this._config.log) {
      this._config.log(msg);
    }
  }

  updateFile(path: string, content: string) {
    this._files = this._files.map(f => (f.fileName === path ? { ...f, content } : f));
    this._watchers.filter(w => w.path === path).forEach(w => w.cb(w.path));
  }
}

export function createTestingSchemaManagerHost(config: CreateTestingSchemaManagerHostOptions) {
  return new TestingSchemaManagerHost(config);
}
