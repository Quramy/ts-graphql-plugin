import ts from 'typescript';

export class ScriptHost implements ts.LanguageServiceHost {
  private readonly _fileMap = new Map<string, string | undefined>();
  private readonly _fileVersionMap = new Map<string, number>();

  constructor(private readonly _currentDirectory: string, private readonly _compilerOptions: ts.CompilerOptions) {}

  readFile(fileName: string) {
    const hit = this._fileMap.get(fileName);
    if (hit != null) return hit;
    return this.loadFromFileSystem(fileName);
  }

  loadFromFileSystem(fileName: string) {
    const content = ts.sys.readFile(fileName, 'uts8');
    this._updateFile(fileName, content);
    return content;
  }

  getCurrentDirectory() {
    return this._currentDirectory;
  }

  getScriptSnapshot(fileName: string) {
    const file = this._fileMap.get(fileName);
    if (file == null) return;
    return ts.ScriptSnapshot.fromString(file);
  }

  getScriptVersion(fileName: string) {
    const version = this._fileVersionMap.get(fileName);
    if (!version) return '0';
    return version + '';
  }

  getScriptFileNames() {
    return [...this._fileMap.keys()];
  }

  getCompilationSettings() {
    return this._compilerOptions;
  }

  getDefaultLibFileName(opt: ts.CompilerOptions) {
    return ts.getDefaultLibFileName(opt);
  }

  // Sinse ts 4.7, imeplement required.
  // Delegating to `ts.sys.fileExists(path)` is not for me, but I don't know whether the following implementation is correct.
  fileExists() {
    return false;
  }

  protected _updateFile(fileName: string, content: string | undefined) {
    this._fileMap.set(fileName, content);
    const currentVersion = this._fileVersionMap.get(fileName) || 0;
    this._fileVersionMap.set(fileName, currentVersion + 1);
  }
}
