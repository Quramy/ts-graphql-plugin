import { globToRegExp } from './glob-to-regexp';

describe(globToRegExp, () => {
  describe('wildcard character', () => {
    test.each([
      { pattern: '**/*', fileName: 'index.ts' },
      { pattern: '**/*', fileName: 'a/index.ts' },
      { pattern: '**/*', fileName: 'a/b/index.ts' },
      { pattern: '**/*.test.ts', fileName: 'index.test.ts' },
      { pattern: 'a/b/*.ts', fileName: 'a/b/index.ts' },
      { pattern: '**/b/*.ts', fileName: 'b/index.ts' },
      { pattern: '**/b/*.ts', fileName: 'a/b/index.ts' },
      { pattern: '**/b/**/*', fileName: 'a/b/index.ts' },
      { pattern: 'index.?ts', fileName: 'index.mts' },
      { pattern: 'index.?ts', fileName: 'index.cts' },
    ])("'$pattern' matches '$fileName'", ({ pattern, fileName }) => {
      expect(globToRegExp(pattern).test(fileName)).toBeTruthy();
    });

    test.each([
      { pattern: '**/*.test.ts', fileName: 'index.ts' },
      { pattern: 'a/b/*.ts', fileName: 'a/index.ts' },
      { pattern: '**/b/*.ts', fileName: 'a/bb/index.ts' },
      { pattern: 'index.?ts', fileName: 'index.ts' },
    ])("'$pattern' does not match '$fileName'", ({ pattern, fileName }) => {
      expect(globToRegExp(pattern).test(fileName)).toBeFalsy();
    });
  });

  describe('escape', () => {
    test.each([
      { pattern: '../.', fileName: '../.' },
      { pattern: '$.ts', fileName: '$.ts' },
      { pattern: '^.ts', fileName: '^.ts' },
      { pattern: '+.ts', fileName: '+.ts' },
      { pattern: '=.ts', fileName: '=.ts' },
      { pattern: '!.ts', fileName: '!.ts' },
      { pattern: '(a)/b.ts', fileName: '(a)/b.ts' },
      { pattern: '[a]/b.ts', fileName: '[a]/b.ts' },
      { pattern: '{a}/b.ts', fileName: '{a}/b.ts' },
    ])("'$pattern' matches '$fileName'", ({ pattern, fileName }) => {
      expect(globToRegExp(pattern).test(fileName)).toBeTruthy();
    });
  });
});
