import ts from 'typescript';
import path from 'path';

import { ScriptHost } from '../script-host';

type Options = {
  files?: {
    fileName: string;
    content: string;
  }[];
};

export class TestingLanguageServiceHost extends ScriptHost implements ts.LanguageServiceHost {
  constructor(options: Options) {
    super(path.resolve(__dirname, '../../'), ts.getDefaultCompilerOptions());
    (options.files || []).forEach(({ fileName, content }) => this._updateFile(fileName, content));
  }

  getFile(fileName: string) {
    const content = this.readFile(fileName);
    if (!content) return undefined;
    return { fileName, content };
  }

  loadFromFileSystem(_fileName: string) {
    return undefined;
  }

  updateFile(fileName: string, content: string) {
    this._updateFile(fileName, content);
  }
}

export function createTestingLanguageServiceAndHost(options: Options) {
  const host = new TestingLanguageServiceHost(options);
  return {
    languageService: ts.createLanguageService(host),
    languageServiceHost: host,
  };
}

export function createTestingLanguageService(options: Options) {
  return createTestingLanguageServiceAndHost(options).languageService;
}
