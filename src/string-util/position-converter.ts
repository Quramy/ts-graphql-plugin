export class OutOfRangeError extends Error {
  constructor() {
    super('Out of range');
  }
}

export function pos2location(content: string, pos: number, throwErrorIfOutOfRange = false) {
  if (throwErrorIfOutOfRange) {
    if (pos < 0 || content.length <= pos) {
      throw new OutOfRangeError();
    }
  }
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

export function location2pos(
  content: string,
  location: { line: number; character: number },
  throwErrorIfOutOfRange = false,
) {
  let il = 0,
    ic = 0;
  if (throwErrorIfOutOfRange) {
    if (location.line < 0 || location.character < 0) {
      throw new OutOfRangeError();
    }
  }
  for (let i = 0; i < content.length; i++) {
    const cc = content[i];
    if (il === location.line) {
      if (throwErrorIfOutOfRange && (cc === '\n' || (cc === '\r' && content[i + 1] === '\n'))) {
        throw new OutOfRangeError();
      }
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
  if (throwErrorIfOutOfRange) {
    throw new OutOfRangeError();
  }
  return content.length;
}
