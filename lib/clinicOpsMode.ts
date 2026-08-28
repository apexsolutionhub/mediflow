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

/**
 * Online → offline: Apex approval applies the change (no sync wait).
 * Offline → online: Apex approval, then manager must sync before cloud mode is live.
 */
export function appliesOnApexApprovalWithoutSync(from: unknown, to: unknown): boolean {
  return (
    parseClinicOpsMode(from) === "online" && parseClinicOpsMode(to) === "offline"
  );
}

/** @deprecated Use appliesOnApexApprovalWithoutSync */
export function isImmediateOpsModeTransition(
  from: unknown,
  to: unknown,
): boolean {
  return appliesOnApexApprovalWithoutSync(from, to);
}

export function opsModeTransitionSummary(
  from: unknown,
  to: unknown,
): {
  appliesOnApprovalWithoutSync: boolean;
  headline: string;
  detail: string;
} {
  const current = parseClinicOpsMode(from);
  const target = parseClinicOpsMode(to);
  if (appliesOnApexApprovalWithoutSync(current, target)) {
    return {
      appliesOnApprovalWithoutSync: true,
      headline: "Apex review, then offline goes live",
      detail:
        "Submit to Apex for review. Once approved, your clinic switches to offline mode right away — no sync step.",
    };
  }
  return {
    appliesOnApprovalWithoutSync: false,
    headline: "Apex review, then sync",
    detail:
      "Submit to Apex for review. After approval, run a full push + pull sync — cloud mode starts only when sync completes.",
  };
}

export const OPS_MODE_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting Apex",
  approved: "Approved — sync required",
  applied: "Active",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
