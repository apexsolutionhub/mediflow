import axios from "axios";

import { api } from "@/lib/api";

export type SyncStep = "idle" | "running" | "ok" | "failed" | "skipped";
export type SyncKind = "sync" | "seed";

export type SyncRun = {
  id: string;
  kind: SyncKind;
  push_status: SyncStep;
  pull_status: SyncStep;
  error_message: string;
  started_at: string;
  finished_at: string | null;
  receipt: {
    /** The backup taken right before this sync. */
    backup?: { ok: boolean; file: string; error: string };
    push?: { counts?: Record<string, Record<string, number>>; conflicts?: number };
    pull?: { counts?: Record<string, Record<string, number>>; conflicts?: number };
  };
};

export type BackupState = "ok" | "stale" | "failed" | "missing";

export type BackupStatus = {
  state: BackupState;
  last_backup_at: string | null;
  last_size: number | null;
  last_error: string;
  count: number;
  secondary_configured: boolean;
  secondary_ok: boolean | null;
  secondary_error: string;
  last_secondary_at: string | null;
};

export type SyncStatus = {
  /** "clinic" on a reception server, "cloud" on the hosted SaaS. Sync only runs on a clinic server. */
  node_mode: "clinic" | "cloud";
  ops_mode: string | null;
  can_sync: boolean;
  seeded_at: string | null;
  last_successful_sync_at: string | null;
  /** The step an approved mode change is waiting for. */
  awaiting_step: "seed" | "sync" | null;
  open_conflicts: number;
  /** Only on a clinic server. */
  backup: BackupStatus | null;
  runs: SyncRun[];
};

export type SyncConflict = {
  id: number;
  entity: string;
  label: string;
  side: "cloud" | "node";
  note: string;
  created_at: string;
};

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const { data } = await api.get<SyncStatus>("/sync/status/");
  return data;
}

export async function fetchSyncConflicts(): Promise<SyncConflict[]> {
  const { data } = await api.get<SyncConflict[]>("/sync/conflicts/");
  return data;
}

/** Runs a sync (or the initial seed) on the clinic server. A failed run is returned, not thrown. */
export async function runSync(kind: SyncKind, runId?: string): Promise<SyncRun> {
  try {
    const { data } = await api.post<SyncRun>(kind === "seed" ? "/sync/seed/" : "/sync/run/", {
      run_id: runId,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.push_status) {
      return error.response.data as SyncRun;
    }
    throw error;
  }
}

/** Backs up the clinic database now. A failed backup is returned with the reason, not thrown. */
export async function runBackup(): Promise<{ ok: boolean; backup: BackupStatus; detail?: string }> {
  try {
    const { data } = await api.post<{ backup: BackupStatus }>("/sync/backup/");
    return { ok: true, backup: data.backup };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.backup) {
      return { ok: false, backup: error.response.data.backup, detail: error.response.data.detail };
    }
    throw error;
  }
}

export const SYNC_ENTITY_LABELS: Record<string, string> = {
  patients: "Patients",
  encounters: "Visits",
  payments: "Payments",
  refunds: "Refunds",
  orders: "Orders",
  medicines: "Medicines",
  stock_movements: "Stock movements",
  damages: "Damaged stock",
  suppliers: "Suppliers",
  services: "Services",
  departments: "Departments",
  charts: "Charts",
  nurse_notes: "Nurse notes",
  appointments: "Appointments",
  referrals: "Referrals",
  billables: "Billable lines",
  result_values: "Lab results",
  radiology_reports: "Radiology reports",
  lab_parameters: "Lab parameters",
  equipment_tickets: "Equipment tickets",
};

/** "12 created, 3 updated" for one side of a run. */
export function summariseCounts(counts?: Record<string, Record<string, number>>): string {
  if (!counts) return "";
  let created = 0;
  let updated = 0;
  for (const row of Object.values(counts)) {
    created += row.created ?? 0;
    updated += row.updated ?? 0;
  }
  if (!created && !updated) return "Nothing changed";
  return [created ? `${created} new` : "", updated ? `${updated} updated` : ""].filter(Boolean).join(", ");
}
