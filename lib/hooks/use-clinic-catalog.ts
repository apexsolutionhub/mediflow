"use client";

import { useCallback, useEffect, useState } from "react";

import { api, results } from "@/lib/api";
import { cacheKey, fetchWithCache, invalidateCache, invalidateCacheKey } from "@/lib/api-cache";

export const CATALOG_TTL_MS = 5 * 60_000;

function catalogCacheId(key: string, params?: Record<string, string | number>) {
  return cacheKey(["catalog", key, JSON.stringify(params ?? {})]);
}

export async function fetchClinicCatalog<T>(
  key: string,
  path: string,
  params?: Record<string, string | number>,
  force = false,
): Promise<T[]> {
  const id = catalogCacheId(key, params);
  if (force) invalidateCacheKey(id);
  return fetchWithCache(
    id,
    async () => {
      const { data: response } = await api.get(path, { params });
      return results<T>(response);
    },
    CATALOG_TTL_MS,
  );
}

export function invalidateClinicCatalog(
  key: string,
  params?: Record<string, string | number>,
) {
  invalidateCacheKey(catalogCacheId(key, params));
}

export function invalidateAllClinicCatalog() {
  invalidateCache("catalog:");
}

export function useClinicCatalog<T>(
  key: string,
  path: string,
  params?: Record<string, string | number>,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const rows = await fetchClinicCatalog<T>(key, path, params, force);
        setData(rows);
        return rows;
      } finally {
        setLoading(false);
      }
    },
    [key, params, path],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}
