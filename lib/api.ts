import axios from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type ClinicUser = {
  id: number;
  username: string;
  clinic_name: string;
  clinic_tin: string;
  role: string;
  logoUrl: string;
  branch_name: string;
  is_active?: boolean;
};

export type BillingSnapshot = {
  clinic_tin: string;
  clinic_name: string;
  logo_url: string;
  branch_name: string;
  setup_fee_etb: number;
  quarterly_fee_etb: number;
  setup_fee_approved: boolean;
  subscription_payment_approved?: boolean;
  period_status: string;
  subscription_paid_until: string | null;
  free_trial_ends_at: string | null;
  due_at?: string | null;
  days_until_due?: number | null;
  billing_hold?: boolean;
  paid_quarters_count?: number;
  payment_channel?: string;
  payment_transaction_ref?: string;
  ops_mode?: "online" | "offline" | string;
};

export const ROLE_HOME: Record<string, string> = {
  manager: "/manager",
  reception: "/reception",
  doctor: "/doctor",
  nurse: "/nurse",
  lab: "/lab",
  pharmacist: "/pharmacy",
};

export function persistSession(payload: {
  access: string;
  refresh?: string;
  user: ClinicUser;
  access_mode: string;
  billing: BillingSnapshot;
}) {
  localStorage.setItem("auth_token", payload.access);
  if (payload.refresh) localStorage.setItem("refresh_token", payload.refresh);
  localStorage.setItem("user", JSON.stringify(payload.user));
  localStorage.setItem("access_mode", payload.access_mode);
  localStorage.setItem("billing", JSON.stringify(payload.billing));
}

export function clearSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("access_mode");
  localStorage.removeItem("billing");
}

export function readUser(): ClinicUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClinicUser;
  } catch {
    return null;
  }
}

export function readBilling(): BillingSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("billing");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BillingSnapshot;
  } catch {
    return null;
  }
}

export function readAccessMode(): string {
  if (typeof window === "undefined") return "full";
  return localStorage.getItem("access_mode") || "full";
}

export function updateBillingSession(billing: BillingSnapshot, accessMode: string) {
  localStorage.setItem("billing", JSON.stringify(billing));
  localStorage.setItem("access_mode", accessMode);
}

export function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) {
    return (data as { results: T[] }).results;
  }
  return [];
}
