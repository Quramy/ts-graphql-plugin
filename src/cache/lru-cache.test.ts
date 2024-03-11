import { LRUCache } from './lru-cache';

describe(LRUCache, () => {
  test('should return cached value', () => {
    const cache = new LRUCache<string, string>(1);

    cache.set('a', 'a');

    expect(cache.get('a')).toBe('a');
  });

  test('should release entry via delete', () => {
    const cache = new LRUCache<string, string>(1);

    cache.set('a', 'a');
    cache.delete('a');

    expect(cache.get('a')).toBe(undefined);
  });

  it('should store entries whose size is specified length via maxLength', () => {
    const cache = new LRUCache<string, string>(2);

    cache.set('a', 'a');
    cache.set('b', 'b');
    cache.set('c', 'c');

    expect(cache.has('a')).toBeFalsy();
    expect(cache.has('b')).toBeTruthy();
    expect(cache.has('c')).toBeTruthy();
  });

  it('should hold entries last recently used', () => {
    const cache = new LRUCache<string, string>(2);

    cache.set('a', 'a');
    cache.set('b', 'b');
    cache.get('a');
    cache.set('c', 'c');

    expect(cache.has('a')).toBeTruthy();
    expect(cache.has('b')).toBeFalsy();
    expect(cache.has('c')).toBeTruthy();
  });
});
