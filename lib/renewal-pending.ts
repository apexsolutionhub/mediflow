const STORAGE_KEY = "mediflow_renewal_pending";

export type RenewalPendingRecord = {
  username: string;
  clinic_name: string;
  clinic_tin?: string;
  phase: "pending" | "rejected";
  submitted_at: string;
};

export function saveRenewalPending(record: RenewalPendingRecord) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function readRenewalPending(): RenewalPendingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RenewalPendingRecord;
  } catch {
    return null;
  }
}

export function clearRenewalPending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
