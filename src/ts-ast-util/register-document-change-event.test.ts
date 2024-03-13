import ts from 'typescript';
import { registerDocumentChangeEvent } from './register-document-change-event';

class TestingScriptSnapshot implements ts.IScriptSnapshot {
  constructor(private readonly text: string) {}
  getText(start: number, end: number) {
    return this.text.slice(start, end);
  }
  getLength() {
    return 0;
  }
  getChangeRange() {
    return undefined;
  }
}

describe(registerDocumentChangeEvent, () => {
  it('should register listener called back on acquireDocument method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: cb,
      onUpdate: jest.fn(),
      onRelease: jest.fn(),
    });
    docRegistry.acquireDocument('main.ts', ts.getDefaultCompilerOptions(), new TestingScriptSnapshot(''), 'version');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
    expect(ts.isSourceFile(cb.mock.lastCall[1])).toBeTruthy();
    expect(cb.mock.lastCall[2]).toBe('version');
  });

  it('should register listener called back on acquireDocumentWithKey method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: cb,
      onUpdate: jest.fn(),
      onRelease: jest.fn(),
    });
    docRegistry.acquireDocumentWithKey(
      'main.ts',
      'main.ts' as any,
      ts.getDefaultCompilerOptions(),
      'key' as any,
      new TestingScriptSnapshot(''),
      'version',
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
    expect(ts.isSourceFile(cb.mock.lastCall[1])).toBeTruthy();
    expect(cb.mock.lastCall[2]).toBe('version');
  });

  it('should register listener called back on updateDocument method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: jest.fn(),
      onUpdate: cb,
      onRelease: jest.fn(),
    });
    docRegistry.updateDocument('main.ts', ts.getDefaultCompilerOptions(), new TestingScriptSnapshot(''), 'version');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
    expect(ts.isSourceFile(cb.mock.lastCall[1])).toBeTruthy();
    expect(cb.mock.lastCall[2]).toBe('version');
  });

  it('should register listener called back on updateDocumentWithKey method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: jest.fn(),
      onUpdate: cb,
      onRelease: jest.fn(),
    });
    docRegistry.updateDocumentWithKey(
      'main.ts',
      'main.ts' as any,
      ts.getDefaultCompilerOptions(),
      'key' as any,
      new TestingScriptSnapshot(''),
      'version',
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
    expect(ts.isSourceFile(cb.mock.lastCall[1])).toBeTruthy();
    expect(cb.mock.lastCall[2]).toBe('version');
  });

  it('should register listener called back on releaseDocument method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: jest.fn(),
      onUpdate: jest.fn(),
      onRelease: cb,
    });
    docRegistry.acquireDocument('main.ts', ts.getDefaultCompilerOptions(), new TestingScriptSnapshot(''), 'version');
    docRegistry.releaseDocument('main.ts', ts.getDefaultCompilerOptions(), ts.ScriptKind.TS, undefined);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
  });

  it('should register listener called back on releaseDocumentWithKey method', () => {
    const docRegistry = ts.createDocumentRegistry();
    const cb = jest.fn();
    registerDocumentChangeEvent(docRegistry, {
      onAcquire: jest.fn(),
      onUpdate: jest.fn(),
      onRelease: cb,
    });
    docRegistry.acquireDocumentWithKey(
      'main.ts',
      'main.ts' as any,
      ts.getDefaultCompilerOptions(),
      'key' as any,
      new TestingScriptSnapshot(''),
      'version',
    );
    docRegistry.releaseDocumentWithKey('main.ts' as any, 'key' as any, ts.ScriptKind.TS, undefined);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.lastCall[0]).toBe('main.ts');
  });
});
