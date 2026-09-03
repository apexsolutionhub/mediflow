/** Shared clinic domain types for role workspaces. */

export type Patient = {
  id: number;
  full_name: string;
  mrn: string;
  phone: string;
  age?: number;
  gender?: string;
  address?: string;
  allergies?: string;
};

export type BillableItem = {
  id: number;
  description: string;
  department: string;
  unit_price: string | number;
  quantity: number;
  paid_amount: string | number;
  payment_status: string;
  total_amount?: string | number;
};

export type ClinicalOrder = {
  id: number;
  order_type: string;
  status: string;
  details: string;
  result_text?: string;
  patient_name?: string;
  encounter_number?: string;
  encounter?: number;
  fulfillment?: "clinic_pharmacy" | "external_print" | string;
  medicine?: number | null;
};

export type Encounter = {
  id: number;
  number: string;
  status: string;
  arrival_type: string;
  referral_source?: string;
  amount_due?: number;
  patient: Patient;
  billables: BillableItem[];
  orders: ClinicalOrder[];
  payments?: { id: number; receipt_number: string; amount: string | number; tender_method: string }[];
  chart?: {
    chief_complaint?: string;
    examination?: string;
    diagnosis?: string;
    clinical_notes?: string;
    treatment_plan?: string;
  };
  nurse_notes?: {
    id: number;
    note_type: string;
    content: string;
    vitals?: Record<string, unknown>;
    created_at?: string;
  }[];
  external_prescriptions?: {
    id: number;
    details: string;
    medicine_name?: string;
  }[];
};

export type BillableService = {
  id: number;
  code: string;
  name: string;
  description?: string;
  department: string;
  service_type: string;
  unit_price: string | number;
  default_quantity?: number;
  is_active: boolean;
  auto_add_on_registration?: boolean;
  requires_payment_before_work?: boolean;
  internal_notes?: string;
};

export const BILLABLE_SERVICE_TYPES = [
  { label: "Consultation", value: "consultation" },
  { label: "Lab", value: "lab" },
  { label: "Radiology", value: "radiology" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Procedure", value: "procedure" },
  { label: "Nursing", value: "nursing" },
  { label: "Other", value: "other" },
] as const;

export const ORDER_TYPE_TO_SERVICE_TYPE: Record<string, string> = {
  lab: "lab",
  radiology: "radiology",
  prescription: "pharmacy",
};

export type Medicine = {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  batch_number?: string;
  expiry_date?: string | null;
  unit_of_measure?: string;
  on_hand: number;
  min_threshold: number;
  unit_price: string | number;
  is_active?: boolean;
  internal_notes?: string;
};

export const MEDICINE_CATEGORIES = [
  { label: "Antibiotic", value: "antibiotic" },
  { label: "Analgesic", value: "analgesic" },
  { label: "Antipyretic", value: "antipyretic" },
  { label: "Antihypertensive", value: "antihypertensive" },
  { label: "Vitamin / supplement", value: "vitamin" },
  { label: "Antacid", value: "antacid" },
  { label: "Topical", value: "topical" },
  { label: "Infusion / injectable", value: "infusion" },
  { label: "Other", value: "other" },
] as const;

export const MEDICINE_UNITS = [
  { label: "Tablet", value: "tablet" },
  { label: "Capsule", value: "capsule" },
  { label: "Bottle", value: "bottle" },
  { label: "Vial", value: "vial" },
  { label: "Tube", value: "tube" },
  { label: "Pack", value: "pack" },
  { label: "Other", value: "other" },
] as const;

export type Department = {
  id: number;
  name: string;
  is_active: boolean;
  branch_name?: string;
};

export type ClinicBranch = {
  id: number;
  name: string;
  is_active?: boolean;
  is_main?: boolean;
  address?: string;
};

export type Appointment = {
  id: number;
  patient: number;
  patient_name?: string;
  scheduled_at: string;
  reason: string;
};

export type EquipmentTicket = {
  id: number;
  title: string;
  details: string;
  status: string;
  resolution?: string;
};

export type DashboardStats = {
  today_encounters: number;
  open_encounters: number;
  pending_payments: number;
  lab_queue: number;
  rx_queue: number;
  low_stock: number;
  open_tickets: number;
  today_revenue: number | string;
};

export function paymentTone(
  status: string,
): "navy" | "orange" | "green" | "muted" | "red" {
  const s = status.toLowerCase();
  if (s.includes("approved")) return "green";
  if (s.includes("partial")) return "orange";
  if (s.includes("await")) return "orange";
  return "muted";
}

export function orderTone(
  status: string,
): "navy" | "orange" | "green" | "muted" | "red" {
  const s = status.toLowerCase();
  if (s.includes("dispensed") || s.includes("reviewed") || s.includes("completed")) {
    return "green";
  }
  if (s.includes("progress")) return "navy";
  if (s.includes("approved")) return "orange";
  if (s.includes("await")) return "muted";
  return "muted";
}

export function money(value: string | number | undefined | null) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
