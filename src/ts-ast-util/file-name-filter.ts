import _path from 'node:path';

import { globToRegExp } from '../string-util/glob-to-regexp';

export function createFileNameFilter({
  specs,
  projectName,
  _forceWin32 = false,
}: {
  specs: string[] | undefined;
  projectName: string;
  _forceWin32?: boolean;
}) {
  const path = _forceWin32 ? _path.win32 : _path;

  const testers = (specs ?? []).map(pattern => {
    if (pattern.includes('*') || pattern.includes('?')) {
      const regexp = globToRegExp(pattern);
      return (normalized: string) => regexp.test(normalized);
    } else {
      const dirOrFileName = pattern[pattern.length - 1] === '/' ? pattern.slice(0, pattern.length - 1) : pattern;
      return (normalized: string) => normalized === dirOrFileName || normalized.startsWith(dirOrFileName + '/');
    }
  });

  const projectRootDirName = path.dirname(projectName);

  const match = (fileName: string) => {
    const normalized = path.relative(projectRootDirName, fileName).replace(/\\/g, '/');
    return testers.some(tester => tester(normalized));
  };

  return match;
}
