export class LRUCache<TKey, TValue> {
  private _cacheMap = new Map<TKey, TValue>();

  constructor(private _maxSize: number = 100) {}

  set(key: TKey, value: TValue) {
    this._cacheMap.set(key, value);
    if (this._cacheMap.size > this._maxSize) {
      const lru = this._cacheMap.keys().next();
      this._cacheMap.delete(lru.value);
    }
  }

  get(key: TKey) {
    const result = this._cacheMap.get(key);
    if (!result) return;
    this._cacheMap.delete(key);
    this._cacheMap.set(key, result);
    return result;
  }

  has(key: TKey) {
    return this._cacheMap.has(key);
  }

  delete(key: TKey) {
    this._cacheMap.delete(key);
  }
}
