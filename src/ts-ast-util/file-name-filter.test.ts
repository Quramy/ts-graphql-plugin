import { createFileNameFilter } from './file-name-filter';

describe(createFileNameFilter, () => {
  it('should return macher function for dirname', () => {
    const match = createFileNameFilter({
      specs: ['__generated__'],
      projectName: '/a/b/tsconfig.json',
    });
    expect(match('/a/b/__generated__/x.ts')).toBeTruthy();
    expect(match('/a/b/x.ts')).toBeFalsy();
  });

  it('should return macher function for dirname with trailing slash', () => {
    const match = createFileNameFilter({
      specs: ['__generated__/'],
      projectName: '/a/b/tsconfig.json',
    });
    expect(match('/a/b/__generated__/x.ts')).toBeTruthy();
    expect(match('/a/b/x.ts')).toBeFalsy();
  });

  it('should return macher function for filename', () => {
    const match = createFileNameFilter({
      specs: ['__generated__/x.ts'],
      projectName: '/a/b/tsconfig.json',
    });
    expect(match('/a/b/__generated__/x.ts')).toBeTruthy();
    expect(match('/a/b/x.ts')).toBeFalsy();
  });

  it('should return macher function for wildcard', () => {
    const match = createFileNameFilter({
      specs: ['**/__generated__/**/*'],
      projectName: '/a/b/tsconfig.json',
    });
    expect(match('/a/b/__generated__/x.ts')).toBeTruthy();
    expect(match('/a/b/c/__generated__/x.ts')).toBeTruthy();
    expect(match('/a/b/x.ts')).toBeFalsy();
  });

  it('should work for win32', () => {
    const match = createFileNameFilter({
      specs: ['__generated__'],
      projectName: '\\a\\b\\tsconfig.json',
      _forceWin32: true,
    });
    expect(match('\\a\\b\\__generated__\\x.ts')).toBeTruthy();
    expect(match('\\a\\b\\x.ts')).toBeFalsy();
  });
});
