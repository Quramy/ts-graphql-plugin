import ts from 'typescript';
import path from 'path';

type Options = {
  files?: {
    fileName: string;
    content: string;
  }[];
};

export function createTestingLanguageService({ files = [] }: Options) {
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

  return ts.createLanguageService(host);
}
