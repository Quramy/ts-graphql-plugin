export function pos2location(content: string, pos: number) {
  let l = 0,
    c = 0;
  for (let i = 0; i < content.length && i < pos; i++) {
    const cc = content[i];
    if (cc === '\n') {
      c = 0;
      l++;
    } else {
      c++;
    }
  }
  return { line: l, character: c };
}

export function location2pos(content: string, location: { line: number; character: number }) {
  let il = 0,
    ic = 0;
  for (let i = 0; i < content.length; i++) {
    const cc = content[i];
    if (il === location.line) {
      if (ic === location.character) {
        return i;
      }
    }
    if (cc === '\n') {
      ic = 0;
      il++;
    } else {
      ic++;
    }
  }
  return content.length;
}
