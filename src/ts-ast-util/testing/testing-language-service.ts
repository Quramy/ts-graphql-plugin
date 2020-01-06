import ts from 'typescript';
import path from 'path';

type Options = {
  files?: {
    fileName: string;
    content: string;
  }[];
};

export function createTestingLanguageServiceAndHost({ files = [] }: Options) {
  const host: ts.LanguageServiceHost = {
    getCurrentDirectory() {
      return path.resolve(__dirname, '../../');
    },
    getScriptSnapshot(fileName: string) {
      const file = files.find(file => file.fileName === fileName);
      if (!file) return;
      return ts.ScriptSnapshot.fromString(file.content);
    },
    getScriptVersion() {
      return '0';
    },
    getScriptFileNames() {
      return files.map(file => file.fileName);
    },
    getCompilationSettings() {
      return ts.getDefaultCompilerOptions();
    },
    getDefaultLibFileName(opt: ts.CompilerOptions) {
      return ts.getDefaultLibFileName(opt);
    },
  };

  return {
    languageService: ts.createLanguageService(host),
    languageServiceHost: host,
  };
}

export function createTestingLanguageService(options: Options) {
  return createTestingLanguageServiceAndHost(options).languageService;
}
