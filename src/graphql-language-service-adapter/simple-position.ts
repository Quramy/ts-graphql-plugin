import type { LineAndCharacter } from '../tsmodule';
import type { IPosition } from 'graphql-language-service';

export class SimplePosition implements IPosition {
  line: number;
  character: number;

  setLine(v: number) {
    this.line = v;
  }

  setCharacter(v: number) {
    this.character = v;
  }

  constructor(lc: LineAndCharacter) {
    this.line = lc.line;
    this.character = lc.character;
  }

  lessThanOrEqualTo(p: IPosition) {
    if (this.line < p.line) return true;
    if (this.line > p.line) return false;
    return this.character <= p.character;
  }
}
