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

export type LabParameter = {
  id: number;
  name: string;
  result_type: "numeric" | "choice" | "text";
  unit?: string;
  ref_low?: string | null;
  ref_high?: string | null;
  critical_low?: string | null;
  critical_high?: string | null;
  choices?: string;
  abnormal_choices?: string;
  sort_order?: number;
  reference_text?: string;
  choice_list?: string[];
};

export type ResultFlag = "normal" | "low" | "high" | "critical" | "abnormal";

export type OrderResultValue = {
  id: number;
  parameter?: number | null;
  name: string;
  unit?: string;
  reference_text?: string;
  value: string;
  flag: ResultFlag;
};

export type ReportTag = "normal" | "abnormal" | "critical";

export type RadiologyReport = {
  technique?: string;
  findings: string;
  impression: string;
  tag: ReportTag;
  attachments: { url: string; name: string }[];
};

export type ClinicalOrder = {
  id: number;
  order_type: string;
  status: string;
  details: string;
  result_text?: string;
  result_values?: OrderResultValue[];
  test_parameters?: LabParameter[];
  radiology_report?: RadiologyReport | null;
  test_name?: string;
  medicine_name?: string;
  medicine_on_hand?: number | null;
  medicine_unit?: string;
  medicine_loose_unit?: string;
  medicine_stock_text?: string;
  medicine_stock_after_text?: string;
  medicine_can_dispense?: boolean;
  quantity?: number;
  sale_unit?: "pack" | "loose" | string;
  dispense_quantity?: number | null;
  abnormal_count?: number;
  has_critical?: boolean;
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
  closed_at?: string | null;
  follow_up_appointments?: Appointment[];
  referrals?: Referral[];
};

export type Referral = {
  id: number;
  encounter?: number;
  destination_kind?: "internal" | "external" | string;
  to_department?: string;
  to_branch?: string;
  external_institution?: string;
  diagnosis?: string;
  lab_summary?: string;
  approval_status?: "pending" | "approved" | "rejected" | string;
  approved_at?: string | null;
  created_at?: string;
  patient_name?: string;
  encounter_number?: string;
  created_by_name?: string;
  approved_by_name?: string;
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
  parameters?: LabParameter[];
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
  category?: string;
  /** Read: the supplier this stock line was bought from. */
  selected_supplier_id?: number | null;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_email?: string;
  /** Sale price of one whole pack. */
  unit_price: string | number;
  cost?: string | number;
  /** Whole packs on hand (the registered "Quantity"). */
  on_hand: number;
  /** The pack unit stock is counted in: box, packet, piece... */
  unit_of_measure?: string;
  pack_size?: number;
  loose_unit?: string;
  loose_price?: string | number | null;
  loose_unit_price?: string | number | null;
  /** Loose units left from an opened pack. */
  loose_stock?: number;
  stock_text?: string;
  received_quantity?: number;
  paid_amount?: string | number;
  total_cost?: string | number;
  credit_amount?: string | number;
  payment_status?: "paid" | "credit";
  batch_number?: string;
  expiry_date?: string | null;
  description?: string;
  image_url?: string;
  min_threshold: number;
  is_active?: boolean;
};

export type Supplier = {
  id: number;
  supplier_name: string;
  supplier_phone: string;
  supplier_email?: string;
  medicine_count?: number;
};

export type MedicineDamage = {
  id: number;
  medicine: number;
  medicine_name: string;
  quantity: number;
  sale_unit: "pack" | "loose";
  quantity_text: string;
  reason: string;
  recorded_by_name: string;
  created_at: string;
};

export const MEDICINE_CATEGORIES = [
  { label: "Pain & fever", value: "pain_fever" },
  { label: "Antibiotics", value: "antibiotics" },
  { label: "Malaria medicines", value: "malaria" },
  { label: "Deworming (worms)", value: "deworming" },
  { label: "Diarrhea & ORS", value: "diarrhea_ors" },
  { label: "Stomach acid / ulcer", value: "stomach_acid_ulcer" },
  { label: "Allergy & itching", value: "allergy" },
  { label: "Cough & cold", value: "cough_cold" },
  { label: "Asthma / breathing", value: "asthma" },
  { label: "Blood pressure", value: "hypertension" },
  { label: "Diabetes", value: "diabetes" },
  { label: "Family planning", value: "family_planning" },
  { label: "Pregnancy / mothers", value: "pregnancy" },
  { label: "Skin", value: "skin" },
  { label: "Fungal", value: "fungal" },
  { label: "Eye / ear", value: "eye_ear" },
  { label: "Vitamins", value: "vitamins" },
  { label: "Other", value: "other" },
] as const;

/** The pack unit stock is counted in. */
export const MEDICINE_UNITS = [
  { label: "Litre", value: "litre" },
  { label: "Kilogram", value: "kilogram" },
  { label: "Piece", value: "piece" },
  { label: "Packet", value: "packet" },
  { label: "Box", value: "box" },
  { label: "Dozen", value: "dozen" },
  { label: "Other", value: "other" },
] as const;

/** What a pack is split into when sold loose. */
export const LOOSE_UNIT_OPTIONS = [
  { label: "Tablet", value: "tablet" },
  { label: "Capsule", value: "capsule" },
  { label: "Sachet", value: "sachet" },
  { label: "Ampoule", value: "ampoule" },
  { label: "Piece", value: "piece" },
  { label: "Millilitre (ml)", value: "ml" },
  { label: "Gram", value: "gram" },
] as const;

/** Common Rx frequency options for doctor prescriptions. */
export const MEDICINE_FREQUENCY_OPTIONS = [
  { label: "Morning one · Night one", value: "Morning one · Night one" },
  { label: "Morning one · Afternoon one · Night one", value: "Morning one · Afternoon one · Night one" },
  { label: "Morning only", value: "Morning only" },
  { label: "Night only / bedtime", value: "Night only" },
  { label: "Once daily (OD)", value: "Once daily (OD)" },
  { label: "Twice daily (BID)", value: "Twice daily (BID)" },
  { label: "Three times daily (TID)", value: "Three times daily (TID)" },
  { label: "Four times daily (QID)", value: "Four times daily (QID)" },
  { label: "Every 6 hours", value: "Every 6 hours" },
  { label: "Every 8 hours", value: "Every 8 hours" },
  { label: "Every 12 hours", value: "Every 12 hours" },
  { label: "Before meals", value: "Before meals" },
  { label: "After meals", value: "After meals" },
  { label: "With meals", value: "With meals" },
  { label: "As needed (PRN)", value: "As needed (PRN)" },
  { label: "Weekly", value: "Weekly" },
  { label: "Monthly", value: "Monthly" },
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
  branch_tin?: string;
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
  pending_payment_items?: number;
  lab_queue: number;
  radiology_queue: number;
  results_ready: number;
  rx_queue: number;
  low_stock: number;
  open_tickets: number;
  today_revenue: number | string;
};

export type ManagerReportPeriod =
  | "day"
  | "month"
  | "quarter"
  | "half_year"
  | "year"
  | "custom";

export type ManagerReportSummary = {
  visits: number;
  new_patients: number;
  open_encounters: number;
  closed_encounters: number;
  revenue: number | string;
  refunds: number | string;
  net_revenue: number | string;
  payment_count: number;
  avg_revenue_per_visit: number | string;
  billable_items: number;
  lab_orders: number;
  radiology_orders: number;
  prescriptions: number;
  referrals: number;
  low_stock: number;
  open_tickets: number;
};

export type ManagerReport = {
  period: ManagerReportPeriod | string;
  period_label: string;
  start_date: string;
  end_date: string;
  branch_name: string;
  summary?: ManagerReportSummary;
  visits: number;
  new_patients: number;
  closed_encounters: number;
  revenue: number | string;
  payment_count: number;
  lab_orders: number;
  radiology_orders: number;
  prescriptions: number;
  referrals: number;
  low_stock: number;
  open_tickets: number;
  revenue_by_day?: { date: string; total: number | string; count: number }[];
  visits_by_day?: { date: string; count: number }[];
  tender_breakdown?: { method: string; total: number | string; count: number }[];
  arrival_breakdown?: { arrival_type: string; count: number }[];
  referral_breakdown?: { kind: string; status: string; count: number }[];
  top_services?: {
    description: string;
    department: string;
    count: number;
    revenue: number | string;
  }[];
  order_status_breakdown?: { order_type: string; status: string; count: number }[];
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

/** How many results are out of range (and whether any is critical), from the values themselves. */
export function abnormalSummary(order: ClinicalOrder): { count: number; critical: boolean } {
  const flags: string[] = (order.result_values ?? []).map((v) => v.flag);
  if (order.radiology_report) flags.push(order.radiology_report.tag);
  return {
    count: flags.filter((f) => f !== "normal").length,
    critical: flags.includes("critical"),
  };
}

/** "PaymentApproved" -> "Payment approved" (statuses arrive as CamelCase keys). */
export function formatStatus(status: string): string {
  const spaced = (status || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : "";
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
