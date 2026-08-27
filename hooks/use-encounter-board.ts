"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { api, results } from "@/lib/api";
import { type Encounter } from "@/lib/clinic";
import {
  getSelectedEncounterId,
  setSelectedEncounterId,
} from "@/lib/clinic-selection";

type Board = "doctor" | "nurse" | "today" | null;

export function useEncounterBoard(board: Board = null) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const toastId = `encounters-load-${board || "all"}`;

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdState(id);
    setSelectedEncounterId(id);
  }, []);

  const load = useCallback(async () => {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
      return [];
    }

    const params: Record<string, string | number> = { page_size: 100 };
    if (board === "doctor") params.board = "doctor";
    else if (board === "nurse") params.board = "nurse";
    else if (board === "today") params.today = 1;

    const { data } = await api.get("/clinic/encounters/", { params });
    const list = results<Encounter>(data);
    setEncounters(list);

    const stored = getSelectedEncounterId();
    setSelectedIdState((prev) => {
      const candidate = prev ?? stored;
      if (candidate && list.some((e) => e.id === candidate)) {
        setSelectedEncounterId(candidate);
        return candidate;
      }
      const fallback = list[0]?.id ?? null;
      setSelectedEncounterId(fallback);
      return fallback;
    });
    setReady(true);
    toast.dismiss(toastId);
    return list;
  }, [board, toastId]);

  useEffect(() => {
    let cancelled = false;

    load().catch(() => {
      if (cancelled) return;
      toast.error("Could not load encounters", { id: toastId });
    });

    return () => {
      cancelled = true;
    };
  }, [load, toastId]);

  const current = useMemo(
    () => encounters.find((e) => e.id === selectedId) ?? null,
    [encounters, selectedId],
  );

  return { encounters, selectedId, setSelectedId, current, load, ready };
}
