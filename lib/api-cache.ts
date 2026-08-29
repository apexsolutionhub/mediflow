type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheKey(parts: (string | number | null | undefined)[]): string {
  return parts.filter((p) => p !== null && p !== undefined).join(":");
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 30_000,
): Promise<T> {
  const now = Date.now();
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.data;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = fetcher()
    .then((data) => {
      memory.set(key, { data, expiresAt: now + ttlMs });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export function invalidateCacheKey(key: string) {
  memory.delete(key);
}
