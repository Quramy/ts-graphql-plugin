export function pos2location(initalContent: string, pos: number) {
  let l = 0,
    c = 0;
  for (let i = 0; i < initalContent.length && i < pos; i++) {
    const cc = initalContent[i];
    if (cc === '\n') {
      c = 0;
      l++;
    } else {
      c++;
    }
  }
  return { line: l, character: c };
}

export function location2pos(initalContent: string, location: { line: number; character: number }) {
  let il = 0,
    ic = 0;
  for (let i = 0; i < initalContent.length; i++) {
    const cc = initalContent[i];
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
  return initalContent.length;
}
