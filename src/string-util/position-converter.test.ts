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

  describe('throwErrorIfOutOfRange', () => {
    describe(pos2location, () => {
      const text = 'abcd\nefg';
      it.each([-1, 8])('should throw an error if pos is out of range', pos => {
        expect(() => pos2location(text, pos, true)).toThrowError();
      });

      it.each([0, 7])('should not throw an error if pos is invalid', pos => {
        expect(() => pos2location(text, pos, true)).not.toThrowError();
      });
    });

    describe(location2pos, () => {
      const text = 'abcd\nefg';
      it.each([
        { line: -1, character: 0 },
        { line: 0, character: -1 },
        { line: 0, character: 4 },
        { line: 1, character: -1 },
        { line: 1, character: 3 },
        { line: 2, character: 0 },
      ])('should throw an error if location is out of range', location => {
        expect(() => location2pos(text, location, true)).toThrowError();
      });
      it.each([
        { line: 0, character: 0 },
        { line: 0, character: 3 },
        { line: 1, character: 0 },
        { line: 1, character: 2 },
      ])('should not throw an error if location is valid range', location => {
        expect(() => location2pos(text, location, true)).not.toThrowError();
      });
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

  describe('throwErrorIfOutOfRange', () => {
    describe(location2pos, () => {
      const text = 'abcd\nefg';
      it.each([
        { line: -1, character: 0 },
        { line: 0, character: -1 },
        { line: 0, character: 4 },
        { line: 1, character: -1 },
        { line: 1, character: 3 },
        { line: 2, character: 0 },
      ])('should throw an error if location is out of range', location => {
        expect(() => location2pos(text, location, true)).toThrowError();
      });
      it.each([
        { line: 0, character: 0 },
        { line: 0, character: 3 },
        { line: 1, character: 0 },
        { line: 1, character: 2 },
      ])('should not throw an error if location is valid range', location => {
        expect(() => location2pos(text, location, true)).not.toThrowError();
      });
    });
  });
});
