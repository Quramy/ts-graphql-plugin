import _path from 'node:path';

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
  const excludeDocuments = (specs ?? []).map(str => (str[str.length - 1] === '/' ? str.slice(0, str.length - 1) : str));
  const projectRootDirName = path.dirname(projectName);

  const match = (fileName: string) => {
    const normalized = path.relative(projectRootDirName, fileName).replace(/\\/g, '/');
    return excludeDocuments.some(spec => spec === normalized || normalized.startsWith(spec + '/'));
  };

  return match;
}
