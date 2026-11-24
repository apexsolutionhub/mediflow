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
  /** New backups are encrypted (a passphrase is set). */
  encryption_on: boolean;
  /** The last backup that succeeded was encrypted. */
  last_encrypted: boolean;
  offsite_configured: boolean;
  offsite_ok: boolean | null;
  offsite_error: string;
  last_offsite_at: string | null;
};

/** How close the clinic server is to being closed to staff, and whether last night's sync was missed. */
export type SyncFreshness = {
  applies: boolean;
  /** Show the reminder: last night's sync was missed, or the clinic is overdue. */
  due: boolean;
  /** One day or less left before staff are locked out, or already overdue. */
  warn: boolean;
  overdue: boolean;
  days_left: number | null;
  max_days: number | null;
  reason: "missed_last_night" | "overdue" | null;
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
  freshness: SyncFreshness;
  /** Only on a clinic server. */
  backup: BackupStatus | null;
  runs: SyncRun[];
};

export type SyncConflictDifference = {
  field: string;
  /** The value on this clinic server. */
  server: unknown;
  /** The value in the cloud. */
  cloud: unknown;
};

export type SyncConflict = {
  id: number;
  entity: string;
  label: string;
  /** Where the conflict was found: the cloud while pushing, or this server while pulling. */
  side: "cloud" | "node";
  /** The copy that is live on both sides after the sync. */
  kept: "cloud" | "server";
  note: string;
  differences: SyncConflictDifference[];
  created_at: string;
  resolved_at: string | null;
  resolved_by: string;
  resolution_note: string;
};

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const { data } = await api.get<SyncStatus>("/sync/status/");
  return data;
}

export async function fetchSyncConflicts(): Promise<SyncConflict[]> {
  const { data } = await api.get<SyncConflict[]>("/sync/conflicts/");
  return data;
}

/** The manager has looked at a conflict (and entered the other version again by hand if it mattered). */
export async function resolveSyncConflict(id: number, note: string): Promise<SyncConflict> {
  const { data } = await api.post<SyncConflict>(`/sync/conflicts/${id}/resolve/`, { note });
  return data;
}

/** "full_name" -> "Full name" */
export function fieldLabel(name: string): string {
  const text = name.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A value as the manager should read it. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
