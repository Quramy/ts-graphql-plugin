import { location2pos } from "../string-util";

function getCols(line: string, pre = 0): number[] {
  const idx = line.indexOf('^');
  if (idx === -1) {
    return [];
  }
  return [idx + pre, ...getCols(line.slice(idx + 1), pre + idx + 1)]
}

export type Marker = {
  line: number;
  character: number;
  pos: number;
};

export type Markers = {
  [key: string]: Marker;
};

export function contentMark(content: string, inputMarkes: Markers) {
  const lines = content.split('\n');
  const actualLines = [] as string[];
  const markInfos = [] as { col: number, line: number; name: string }[];
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (!line.match(/\s*%%%.*%%%\s*$/)) {
      actualLines.push(line);
      continue;
    }
    const cols = getCols(line);
    ++i;
    if (!lines[i]) break;
    const marks = lines[i].match(/^\s*%%%(.*)%%%\s*$/);
    if (!marks) continue;
    const names = marks[1].trim().split(/\s+/);
    for (let j = 0; j < Math.min(cols.length, names.length); ++j) {
      markInfos.push({
        line: actualLines.length - 1,
        col: cols[j],
        name: names[j],
      });
    }
  }
  const actualContent = actualLines.join('\n');
  const markers = markInfos.reduce((acc, { name, line, col: character } ) => {
    return {
      ...acc,
      [name]: {
        line,
        character,
        pos: location2pos(actualContent, { line, character }),
      },
    };
  }, { } as Markers);
  Object.assign(inputMarkes, markers);
  return actualContent;
};
