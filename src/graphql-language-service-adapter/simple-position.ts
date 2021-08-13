import { IPosition } from 'graphql-language-service-types';

export class SimplePosition implements IPosition {
  line: number;
  character: number;

  setLine(v: number) {
    this.line = v;
  }

  setCharacter(v: number) {
    this.character = v;
  }

  constructor(lc: ts.LineAndCharacter) {
    this.line = lc.line;
    this.character = lc.character;
  }

  lessThanOrEqualTo(p: IPosition) {
    if (this.line < p.line) return true;
    if (this.line > p.line) return false;
    return this.character <= p.character;
  }
}
