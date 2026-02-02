type Entry<T> = { value: T; expiresAt: number };

const mem = new Map<string, Entry<any>>();

export function getCache<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  mem.set(key, { value, expiresAt: Date.now() + ttlMs });
}
