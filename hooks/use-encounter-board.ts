"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { api, results } from "@/lib/api";
import { cacheKey, fetchWithCache, invalidateCacheKey } from "@/lib/api-cache";
import { type Encounter } from "@/lib/clinic";
import {
  getSelectedEncounterId,
  setSelectedEncounterId,
} from "@/lib/clinic-selection";

type Board = "doctor" | "nurse" | "today" | null;

const ENCOUNTER_TTL_MS = 30_000;

function boardCacheKey(board: Board) {
  return cacheKey(["encounters", board ?? "all"]);
}

async function fetchEncounters(board: Board): Promise<Encounter[]> {
  const params: Record<string, string | number> = { page_size: 100 };
  if (board === "doctor") params.board = "doctor";
  else if (board === "nurse") params.board = "nurse";
  else if (board === "today") params.today = 1;

  const { data } = await api.get("/clinic/encounters/", { params });
  return results<Encounter>(data);
}

function applySelection(list: Encounter[], prev: number | null): number | null {
  const stored = getSelectedEncounterId();
  const candidate = prev ?? stored;
  if (candidate && list.some((e) => e.id === candidate)) {
    setSelectedEncounterId(candidate);
    return candidate;
  }
  const fallback = list[0]?.id ?? null;
  setSelectedEncounterId(fallback);
  return fallback;
}

export function invalidateEncounterBoardCache(board?: Board) {
  if (board === undefined) {
    invalidateCacheKey(boardCacheKey(null));
    invalidateCacheKey(boardCacheKey("doctor"));
    invalidateCacheKey(boardCacheKey("nurse"));
    invalidateCacheKey(boardCacheKey("today"));
    return;
  }
  invalidateCacheKey(boardCacheKey(board));
}

export function useEncounterBoard(board: Board = null) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const toastId = `encounters-load-${board || "all"}`;

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdState(id);
    setSelectedEncounterId(id);
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
        return [];
      }

      const key = boardCacheKey(board);
      if (force) invalidateCacheKey(key);

      try {
        const list = await fetchWithCache(key, () => fetchEncounters(board), ENCOUNTER_TTL_MS);
        setEncounters(list);
        setSelectedIdState((prev) => applySelection(list, prev));
        setReady(true);
        toast.dismiss(toastId);
        return list;
      } catch {
        toast.error("Could not load encounters", { id: toastId });
        return [];
      }
    },
    [board, toastId],
  );

  useEffect(() => {
    let cancelled = false;
    void load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const current = useMemo(
    () => encounters.find((e) => e.id === selectedId) ?? null,
    [encounters, selectedId],
  );

  return { encounters, selectedId, setSelectedId, current, load, ready };
}
