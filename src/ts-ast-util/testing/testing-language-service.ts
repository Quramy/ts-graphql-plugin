import ts from 'typescript';
import path from 'path';

type Options = {
  files?: {
    fileName: string;
    content: string;
  }[];
};

export class TestingLanguageServiceHost implements ts.LanguageServiceHost {
  public files: { fileName: string; content: string; version: number }[];

  constructor(options: Options) {
    this.files = (options.files || []).map(f => ({ ...f, version: 0 }));
  }

  getCurrentDirectory() {
    return path.resolve(__dirname, '../../');
  }

  getScriptSnapshot(fileName: string) {
    const file = this.getFile(fileName);
    if (!file) return;
    return ts.ScriptSnapshot.fromString(file.content);
  }

  getScriptVersion(fileName: string) {
    const file = this.getFile(fileName);
    if (!file) return '';
    return `${file.version}`;
  }

  getScriptFileNames() {
    return this.files.map(file => file.fileName);
  }

  getCompilationSettings() {
    return ts.getDefaultCompilerOptions();
  }

  getDefaultLibFileName(opt: ts.CompilerOptions) {
    return ts.getDefaultLibFileName(opt);
  }

  getFile(fileName: string) {
    const file = this.files.find(file => file.fileName === fileName);
    return file;
  }

  updateFile(fileName: string, content: string) {
    const file = this.getFile(fileName);
    if (!file) {
      this.files.push({
        fileName,
        content,
        version: 0,
      });
    } else {
      file.content = content;
      file.version = file.version + 1;
    }
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
