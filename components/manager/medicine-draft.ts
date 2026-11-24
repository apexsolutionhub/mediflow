import type { Medicine } from "@/lib/clinic";

/**
 * One medicine registration line as the manager edits it (everything is text until it is sent).
 * The same draft powers the intake form (many lines) and the edit dialog (one line).
 */
export type MedicineDraft = {
  name: string;
  category: string;
  supplier_id: string;
  unit_price: string;
  cost: string;
  on_hand: string;
  unit_of_measure: string;
  batch_number: string;
  /** YYYY-MM-DD */
  expiry_date: string;
  paid_amount: string;
  /** Until the manager types a paid amount, it follows quantity x cost (fully paid). */
  paid_touched: boolean;
  split: boolean;
  pack_size: string;
  loose_unit: string;
  loose_price: string;
  description: string;
  image_url: string;
  /** Edit only. */
  min_threshold: string;
};

export type DraftErrors = Partial<Record<keyof MedicineDraft, string>>;

export function emptyDraft(): MedicineDraft {
  return {
    name: "",
    category: "",
    supplier_id: "",
    unit_price: "",
    cost: "",
    on_hand: "",
    unit_of_measure: "piece",
    batch_number: "",
    expiry_date: "",
    paid_amount: "",
    paid_touched: false,
    split: false,
    pack_size: "",
    loose_unit: "tablet",
    loose_price: "",
    description: "",
    image_url: "",
    min_threshold: "5",
  };
}

export function draftFromMedicine(m: Medicine): MedicineDraft {
  const split = Number(m.pack_size ?? 1) > 1;
  return {
    name: m.name,
    category: m.category || "",
    supplier_id: m.selected_supplier_id != null ? String(m.selected_supplier_id) : "",
    unit_price: String(Number(m.unit_price)),
    cost: m.cost != null ? String(Number(m.cost)) : "",
    on_hand: String(m.on_hand),
    unit_of_measure: m.unit_of_measure || "piece",
    batch_number: m.batch_number ?? "",
    expiry_date: (m.expiry_date ?? "").slice(0, 10),
    paid_amount: m.paid_amount != null ? String(Number(m.paid_amount)) : "",
    paid_touched: true,
    split,
    pack_size: split ? String(m.pack_size) : "",
    loose_unit: m.loose_unit || "tablet",
    loose_price: m.loose_price != null && m.loose_price !== "" ? String(Number(m.loose_price)) : "",
    description: m.description ?? "",
    image_url: m.image_url ?? "",
    min_threshold: String(m.min_threshold ?? 5),
  };
}

const num = (raw: string) => (raw.trim() === "" ? NaN : Number(raw));

/** What was bought: quantity received x cost. Editing adds the change in quantity to what was received. */
export function receivedFor(draft: MedicineDraft, original?: Medicine | null): number {
  const qty = Number(draft.on_hand) || 0;
  if (!original) return qty;
  return Math.max(0, Number(original.received_quantity ?? original.on_hand) + (qty - Number(original.on_hand)));
}

export const lineTotal = (draft: MedicineDraft, original?: Medicine | null) =>
  receivedFor(draft, original) * (Number(draft.cost) || 0);

export const linePaid = (draft: MedicineDraft, original?: Medicine | null) =>
  draft.paid_touched ? Number(draft.paid_amount) || 0 : lineTotal(draft, original);

export const lineCredit = (draft: MedicineDraft, original?: Medicine | null) =>
  Math.max(0, lineTotal(draft, original) - linePaid(draft, original));

const todayIso = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** A passed expiry date is allowed (old stock) but worth a warning. */
export const isPastDate = (iso: string) => Boolean(iso) && iso < todayIso();

/** Field errors that block saving. Same rules the server enforces. */
export function validateDraft(
  draft: MedicineDraft,
  { mode, original }: { mode: "intake" | "edit"; original?: Medicine | null },
): DraftErrors {
  const e: DraftErrors = {};
  if (draft.name.trim().length < 2) e.name = "Enter the medicine name.";
  if (!draft.category) e.category = "Select a category.";
  if (!draft.supplier_id) e.supplier_id = "Select a supplier.";
  const price = num(draft.unit_price);
  if (!(price > 0)) e.unit_price = "Enter a sale price above 0.";
  if (draft.cost.trim() !== "" && !(num(draft.cost) >= 0)) e.cost = "Cost cannot be negative.";
  const qty = num(draft.on_hand);
  if (!Number.isInteger(qty) || qty < (mode === "intake" ? 1 : 0)) {
    e.on_hand = mode === "intake" ? "Enter a quantity of 1 or more." : "Enter a whole number.";
  }
  if (!draft.unit_of_measure) e.unit_of_measure = "Select a unit.";
  if (!draft.batch_number.trim()) e.batch_number = "Enter the batch number.";
  if (draft.split) {
    const size = num(draft.pack_size);
    if (!Number.isInteger(size) || size < 2) e.pack_size = "A pack holds 2 or more loose units.";
    if (draft.loose_price.trim() !== "" && !(num(draft.loose_price) >= 0)) {
      e.loose_price = "Loose price cannot be negative.";
    }
  }
  if (draft.paid_touched && draft.paid_amount.trim() !== "") {
    const paid = num(draft.paid_amount);
    if (!(paid >= 0)) e.paid_amount = "Paid amount cannot be negative.";
    else if (paid - lineTotal(draft, original) > 0.005) {
      e.paid_amount = `Cannot exceed the total cost (${lineTotal(draft, original).toFixed(2)}).`;
    }
  }
  return e;
}

export function draftToPayload(draft: MedicineDraft, { mode, original }: { mode: "intake" | "edit"; original?: Medicine | null }) {
  const payload: Record<string, unknown> = {
    name: draft.name.trim(),
    category: draft.category,
    supplier_id: Number(draft.supplier_id),
    unit_price: Number(draft.unit_price),
    cost: Number(draft.cost) || 0,
    on_hand: Number(draft.on_hand),
    unit_of_measure: draft.unit_of_measure || "piece",
    pack_size: draft.split ? Math.floor(Number(draft.pack_size)) : 1,
    loose_unit: draft.split ? draft.loose_unit || "tablet" : "",
    loose_price: draft.split && draft.loose_price.trim() !== "" ? Number(draft.loose_price) : null,
    paid_amount: Math.round(linePaid(draft, original) * 100) / 100,
    batch_number: draft.batch_number.trim(),
    expiry_date: draft.expiry_date || null,
    description: draft.description.trim(),
    image_url: draft.image_url.trim(),
  };
  payload.min_threshold = Number(draft.min_threshold) || 0;
  return payload;
}

/** Turns the server's field errors for one line into the draft's error shape. */
export function serverErrorsToDraft(errors: Record<string, unknown> | undefined): DraftErrors {
  const out: DraftErrors = {};
  if (!errors) return out;
  for (const [key, value] of Object.entries(errors)) {
    const text = Array.isArray(value) ? String(value[0]) : String(value);
    const field = key === "on_hand" ? "on_hand" : (key as keyof MedicineDraft);
    out[field] = text;
  }
  return out;
}

export const draftErrorsAreEmpty = (errors: DraftErrors) => Object.keys(errors).length === 0;
