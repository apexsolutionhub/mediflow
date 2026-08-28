"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import { api, readBilling } from "@/lib/api";
import {
  isImmediateOpsModeTransition,
  parseClinicOpsMode,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";

export type OpsModeRequest = {
  id: number;
  current_ops_mode: string;
  requested_ops_mode: string;
  request_note?: string;
  status: string;
  requested_by_username?: string;
  review_note?: string;
  created_at: string;
  reviewed_at?: string | null;
  applied_at?: string | null;
  applies_immediately?: boolean;
};

export type OpsModeStatus = {
  ops_mode: string;
  can_request_change: boolean;
  pending_request: OpsModeRequest | null;
  approved_awaiting_sync: OpsModeRequest | null;
  latest_request: OpsModeRequest | null;
  recent_requests: OpsModeRequest[];
  next_mode: ClinicOpsMode;
  next_mode_applies_immediately: boolean;
};

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; name?: string; message?: string };
  return (
    err.code === "ERR_CANCELED" ||
    err.name === "CanceledError" ||
    err.message === "canceled"
  );
}

export function buildFallbackOpsModeStatus(opsMode?: string | null): OpsModeStatus {
  const current = parseClinicOpsMode(opsMode);
  const next: ClinicOpsMode = current === "online" ? "offline" : "online";
  return {
    ops_mode: current,
    can_request_change: true,
    pending_request: null,
    approved_awaiting_sync: null,
    latest_request: null,
    recent_requests: [],
    next_mode: next,
    next_mode_applies_immediately: isImmediateOpsModeTransition(current, next),
  };
}

export function notifyOpsModeChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clinic:ops-mode-changed"));
  }
}

function readInitialStatus(): OpsModeStatus | null {
  const billing = readBilling();
  if (!billing) return null;
  return buildFallbackOpsModeStatus(billing.ops_mode);
}

export function useOpsModeStatus(options?: {
  autoLoad?: boolean;
  /** When false, overview-style pages skip the ops-mode API entirely. */
  fetchDetails?: boolean;
}) {
  const autoLoad = options?.autoLoad !== false;
  const fetchDetails = options?.fetchDetails !== false;
  const [status, setStatus] = useState<OpsModeStatus | null>(() => readInitialStatus());
  const [loading, setLoading] = useState(autoLoad && fetchDetails);
  const [refreshing, setRefreshing] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyBillingFallback = useCallback(() => {
    const billing = readBilling();
    if (billing) {
      setStatus(buildFallbackOpsModeStatus(billing.ops_mode));
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!fetchDetails) {
        applyBillingFallback();
        setLoading(false);
        return readInitialStatus();
      }

      if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
        applyBillingFallback();
        setLoading(false);
        return readInitialStatus();
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const { data } = await api.get<OpsModeStatus>("/billing/ops-mode/", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setStatus(data);
          setApiUnavailable(false);
        }
        return data;
      } catch (error: unknown) {
        if (controller.signal.aborted || isAbortError(error)) {
          return null;
        }

        const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (statusCode === 404) {
          setApiUnavailable(true);
        }

        applyBillingFallback();
        return readInitialStatus();
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [applyBillingFallback, fetchDetails],
  );

  useEffect(() => {
    if (!autoLoad) return;

    const run = () => void load();
    if (fetchDetails) {
      run();
    } else {
      applyBillingFallback();
      setLoading(false);
    }

    const onBillingSync = () => applyBillingFallback();
    window.addEventListener("clinic:ops-mode-changed", onBillingSync);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener("clinic:ops-mode-changed", onBillingSync);
    };
  }, [autoLoad, applyBillingFallback, fetchDetails, load]);

  const submitRequest = useCallback(
    async (requested_ops_mode: ClinicOpsMode, request_note: string) => {
      const { data } = await api.post<{
        detail: string;
        applied_immediately: boolean;
        ops_mode: string;
        request: OpsModeRequest;
      }>("/billing/ops-mode/request/", {
        requested_ops_mode,
        request_note: request_note.trim(),
      });

      notifyOpsModeChanged();
      await load(true);
      return data;
    },
    [load],
  );

  const currentMode = parseClinicOpsMode(status?.ops_mode);

  return {
    status,
    currentMode,
    loading,
    refreshing,
    apiUnavailable,
    load,
    submitRequest,
  };
}
