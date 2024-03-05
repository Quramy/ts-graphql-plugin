import ts from 'typescript/lib/tsserverlibrary';

export type DocumentRegistryProxyCreateOptions = {
  readonly delegate: ts.DocumentRegistry;
};

export type ScriptChangeEventListener = {
  onAcquire: (fileName: string, sourceFile: ts.SourceFile, version: string) => void;
  onUpdate: (fileName: string, sourceFile: ts.SourceFile, version: string) => void;
  onRelease: (fileName: string) => void;
};

export class DocumentRegistryProxy implements ts.DocumentRegistry {
  private readonly _delegate: ts.DocumentRegistry;
  public scriptChangeEventListener?: ScriptChangeEventListener;

  constructor({ delegate }: DocumentRegistryProxyCreateOptions) {
    this._delegate = delegate;
  }

  acquireDocument(...args: Parameters<ts.DocumentRegistry['acquireDocument']>) {
    const [fileName, , , version] = args;
    const sourceFile = this._delegate.acquireDocument(...args);
    this.scriptChangeEventListener?.onAcquire(fileName, sourceFile, version);
    return sourceFile;
  }

  acquireDocumentWithKey(...args: Parameters<ts.DocumentRegistry['acquireDocumentWithKey']>) {
    const [fileName, , , , , version] = args;
    const sourceFile = this._delegate.acquireDocumentWithKey(...args);
    this.scriptChangeEventListener?.onAcquire(fileName, sourceFile, version);
    return sourceFile;
  }

  updateDocument(...args: Parameters<ts.DocumentRegistry['updateDocument']>) {
    const [fileName, , , version] = args;
    const sourceFile = this._delegate.updateDocument(...args);
    this.scriptChangeEventListener?.onUpdate(fileName, sourceFile, version);
    return sourceFile;
  }

  updateDocumentWithKey(...args: Parameters<ts.DocumentRegistry['updateDocumentWithKey']>) {
    const [fileName, , , , , version] = args;
    const sourceFile = this._delegate.updateDocumentWithKey(...args);
    this.scriptChangeEventListener?.onUpdate(fileName, sourceFile, version);
    return sourceFile;
  }

  getKeyForCompilationSettings(settings: ts.CompilerOptions) {
    return this._delegate.getKeyForCompilationSettings(settings);
  }

  releaseDocument(fileName: string, compilationSettings: ts.CompilerOptions, scriptKind?: ts.ScriptKind): void;
  releaseDocument(
    fileName: string,
    compilationSettings: ts.CompilerOptions,
    scriptKind: ts.ScriptKind,
    impliedNodeFormat: ts.ResolutionMode,
  ): void;
  releaseDocument(fileName: string, ...args: any[]) {
    (this._delegate.releaseDocument as any as Function)(fileName, ...args);
    this.scriptChangeEventListener?.onRelease(fileName);
  }

  releaseDocumentWithKey(path: ts.Path, key: ts.DocumentRegistryBucketKey, scriptKind?: ts.ScriptKind): void;
  releaseDocumentWithKey(
    path: ts.Path,
    key: ts.DocumentRegistryBucketKey,
    scriptKind: ts.ScriptKind,
    impliedNodeFormat: ts.ResolutionMode,
  ): void;
  releaseDocumentWithKey(fileName: string, ...args: any[]) {
    (this._delegate.releaseDocumentWithKey as any as Function)(fileName, ...args);
    this.scriptChangeEventListener?.onRelease(fileName);
  }

  reportStats() {
    return this._delegate.reportStats();
  }
}
