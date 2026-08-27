export const CLINIC_OPS_MODES = ["online", "offline"] as const;

export type ClinicOpsMode = (typeof CLINIC_OPS_MODES)[number];

export const DEFAULT_CLINIC_OPS_MODE: ClinicOpsMode = "online";

export const CLINIC_OPS_MODE_LABELS: Record<ClinicOpsMode, string> = {
  online: "Online (cloud)",
  offline: "Offline with sync",
};

export const CLINIC_OPS_MODE_SHORT_LABELS: Record<ClinicOpsMode, string> = {
  online: "Online",
  offline: "Offline + sync",
};

export const CLINIC_OPS_MODE_DESCRIPTIONS: Record<ClinicOpsMode, string> = {
  online:
    "Clinic runs fully in the cloud. Staff need connectivity during the day for live queues, payments, and charts.",
  offline:
    "Clinic works on a local database during the day. Changes sync to the cloud in the evening or night — built for unreliable internet.",
};

export function parseClinicOpsMode(raw: unknown): ClinicOpsMode {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "offline" || value === "offline_sync" || value === "hybrid") {
    return "offline";
  }
  return "online";
}

export function isOfflineClinicOpsMode(mode: unknown): boolean {
  return parseClinicOpsMode(mode) === "offline";
}
