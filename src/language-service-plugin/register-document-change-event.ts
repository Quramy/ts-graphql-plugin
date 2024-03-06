import type ts from 'typescript';

type DocumentChangeEventListener = {
  onAcquire: (fileName: string, sourceFile: ts.SourceFile, version: string) => void;
  onUpdate: (fileName: string, sourceFile: ts.SourceFile, version: string) => void;
  onRelease: (fileName: string) => void;
};

export function registerDocumentChangeEvent(
  target: ts.DocumentRegistry,
  documentChangeEventListener: DocumentChangeEventListener,
) {
  target.acquireDocument = new Proxy(target.acquireDocument, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['acquireDocument']>) => {
      const [fileName, , , version] = args;
      const sourceFile = delegate.apply(thisArg, args);
      documentChangeEventListener.onAcquire(fileName, sourceFile, version);
      return sourceFile;
    },
  });

  target.acquireDocumentWithKey = new Proxy(target.acquireDocumentWithKey, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['acquireDocumentWithKey']>) => {
      const [fileName, , , , , version] = args;
      const sourceFile = delegate.apply(thisArg, args);
      documentChangeEventListener.onAcquire(fileName, sourceFile, version);
      return sourceFile;
    },
  });

  target.updateDocument = new Proxy(target.updateDocument, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['updateDocument']>) => {
      const [fileName, , , version] = args;
      const sourceFile = delegate.apply(thisArg, args);
      documentChangeEventListener.onUpdate(fileName, sourceFile, version);
      return sourceFile;
    },
  });

  target.updateDocumentWithKey = new Proxy(target.updateDocumentWithKey, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['updateDocumentWithKey']>) => {
      const [fileName, , , , , version] = args;
      const sourceFile = delegate.apply(thisArg, args);
      documentChangeEventListener.onUpdate(fileName, sourceFile, version);
      return sourceFile;
    },
  });

  target.releaseDocument = new Proxy(target.releaseDocument, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['releaseDocument']>) => {
      const [fileName] = args;
      delegate.apply(thisArg, args);
      documentChangeEventListener.onRelease(fileName);
    },
  });

  target.releaseDocumentWithKey = new Proxy(target.releaseDocumentWithKey, {
    apply: (delegate, thisArg, args: Parameters<ts.DocumentRegistry['releaseDocumentWithKey']>) => {
      const [fileName] = args;
      delegate.apply(thisArg, args);
      documentChangeEventListener.onRelease(fileName);
    },
  });
}
