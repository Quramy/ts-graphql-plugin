import { location2pos, pos2location } from './position-converter';

describe('LF', () => {
  describe(location2pos, () => {
    it('should convert from location to position', () => {
      const text = `abc
def`;
      expect(location2pos(text, { line: 0, character: 0 })).toBe(0);
      expect(location2pos(text, { line: 1, character: 0 })).toBe(4);
    });
  });

  describe(pos2location, () => {
    it('should convert from position to location', () => {
      const text = `abc
def`;
      expect(pos2location(text, 0)).toStrictEqual({ line: 0, character: 0 });
      expect(pos2location(text, 4)).toStrictEqual({ line: 1, character: 0 });
    });
  });
});

describe('CRLF', () => {
  describe(location2pos, () => {
    it('should convert from location to position', () => {
      const text = 'abc\r\ndef';
      expect(location2pos(text, { line: 0, character: 0 })).toBe(0);
      expect(location2pos(text, { line: 1, character: 0 })).toBe(5);
    });
  });

  describe(pos2location, () => {
    it('should convert from position to location', () => {
      const text = 'abc\r\ndef';
      expect(pos2location(text, 0)).toStrictEqual({ line: 0, character: 0 });
      expect(pos2location(text, 5)).toStrictEqual({ line: 1, character: 0 });
    });
  });
});
