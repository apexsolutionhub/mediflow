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

/** No mode change is immediate: going offline waits for the initial seed, going online for the final sync. */
export function appliesOnApexApprovalWithoutSync(_from: unknown, _to: unknown): boolean {
  return false;
}

/** @deprecated Use appliesOnApexApprovalWithoutSync */
export function isImmediateOpsModeTransition(from: unknown, to: unknown): boolean {
  return appliesOnApexApprovalWithoutSync(from, to);
}

/** The step an approved change waits for: "seed" when going offline, "sync" when going online. */
export function opsModeAwaitedStep(to: unknown): "seed" | "sync" {
  return parseClinicOpsMode(to) === "offline" ? "seed" : "sync";
}

export function opsModeTransitionSummary(
  from: unknown,
  to: unknown,
): {
  appliesOnApprovalWithoutSync: boolean;
  toOffline: boolean;
  headline: string;
  detail: string;
} {
  const target = parseClinicOpsMode(to);
  void from;
  if (target === "offline") {
    return {
      appliesOnApprovalWithoutSync: false,
      toOffline: true,
      headline: "Apex review, then seed",
      detail:
        "Submit to Apex for review. After approval, set up your reception server and run the initial seed — offline mode starts only when the seed completes. Until then you keep working on the cloud.",
    };
  }
  return {
    appliesOnApprovalWithoutSync: false,
    toOffline: false,
    headline: "Apex review, then sync",
    detail:
      "Submit to Apex for review. After approval, run a full push + pull sync — cloud mode starts only when sync completes.",
  };
}

export const OPS_MODE_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting Apex",
  approved: "Approved — awaiting seed or sync",
  applied: "Active",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
