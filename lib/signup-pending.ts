const STORAGE_KEY = "mediflow_signup_pending";

export type SignupPendingRecord = {
  username: string;
  clinic_name: string;
  clinic_tin?: string;
  submitted_at: string;
};

export function saveSignupPending(record: SignupPendingRecord) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function readSignupPending(): SignupPendingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignupPendingRecord;
  } catch {
    return null;
  }
}

export function clearSignupPending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
