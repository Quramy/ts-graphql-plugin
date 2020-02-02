import { SimplePosition } from './simple-position';

describe(SimplePosition, () => {
  describe(SimplePosition.prototype.lessThanOrEqualTo, () => {
    it('should return compared result to another position', () => {
      const p1 = new SimplePosition({ line: 1, character: 10 });
      const p2 = new SimplePosition({ line: 0, character: 10 });
      const p3 = new SimplePosition({ line: 1, character: 11 });
      const p4 = new SimplePosition({ line: 1, character: 10 });
      expect(p1.lessThanOrEqualTo(p2)).toBeFalsy();
      expect(p1.lessThanOrEqualTo(p3)).toBeTruthy();
      expect(p1.lessThanOrEqualTo(p4)).toBeTruthy();
    });
  });
});
