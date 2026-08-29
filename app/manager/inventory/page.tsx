"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, Check, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { MEDICINE_CATEGORIES, MEDICINE_UNITS, type Medicine, money } from "@/lib/clinic";

type MedicineFormValues = {
  name: string;
  description: string;
  sku: string;
  category: string;
  batch_number: string;
  expiry_date: Date | null;
  unit_of_measure: string;
  on_hand: number;
  min_threshold: number;
  unit_price: number;
  is_active: boolean;
  internal_notes: string;
};

const catalogScrollClass =
  "max-h-[32rem] overflow-y-auto overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const defaultMedicineValues = (): MedicineFormValues => ({
  name: "",
  description: "",
  sku: "",
  category: "other",
  batch_number: "",
  expiry_date: null,
  unit_of_measure: "tablet",
  on_hand: 20,
  min_threshold: 5,
  unit_price: 10,
  is_active: true,
  internal_notes: "",
});

function unitLabel(value: string) {
  return MEDICINE_UNITS.find((u) => u.value === value)?.label ?? value;
}

function categoryLabel(value: string) {
  return MEDICINE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toApiDateString(value: Date | null | undefined): string | null {
  if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function medicineToFormValues(m: Medicine): MedicineFormValues {
  return {
    name: m.name,
    description: m.description ?? "",
    sku: m.sku ?? "",
    category: m.category || "other",
    batch_number: m.batch_number ?? "",
    expiry_date: parseApiDate(m.expiry_date),
    unit_of_measure: m.unit_of_measure || "tablet",
    on_hand: m.on_hand,
    min_threshold: m.min_threshold,
    unit_price: Number(m.unit_price),
    is_active: m.is_active !== false,
    internal_notes: m.internal_notes ?? "",
  };
}

function isExpired(expiryDate?: string | null) {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  expiry.setHours(23, 59, 59, 999);
  return expiry.getTime() < Date.now();
}

function formatExpiry(expiryDate?: string | null) {
  if (!expiryDate) return null;
  return new Date(expiryDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ManagerInventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [pendingDeleteMedicine, setPendingDeleteMedicine] = useState<Medicine | null>(null);
  const [deletingMedicineId, setDeletingMedicineId] = useState<number | null>(null);
  const [savingMedicine, setSavingMedicine] = useState(false);

  const medForm = useForm<MedicineFormValues>({
    defaultValues: defaultMedicineValues(),
  });

  const load = useCallback(async (force = false) => {
    const rows = await fetchClinicCatalog<Medicine>(
      "medicines",
      "/clinic/medicines/",
      { page_size: 200 },
      force,
    );
    setMedicines(rows);
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load inventory"));
  }, [load]);

  const lowStock = useMemo(
    () => medicines.filter((m) => m.is_active !== false && m.on_hand <= m.min_threshold),
    [medicines],
  );

  const expiredCount = useMemo(
    () => medicines.filter((m) => m.is_active !== false && isExpired(m.expiry_date)).length,
    [medicines],
  );

  const activeCount = useMemo(
    () => medicines.filter((m) => m.is_active !== false).length,
    [medicines],
  );

  const resetMedicineForm = () => {
    medForm.reset(defaultMedicineValues());
    setEditingMedicineId(null);
  };

  const startEditMedicine = (medicine: Medicine) => {
    setEditingMedicineId(medicine.id);
    medForm.reset(medicineToFormValues(medicine));
    document.getElementById("medicine-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const buildPayload = (values: MedicineFormValues) => ({
    ...values,
    on_hand: Number(values.on_hand),
    min_threshold: Number(values.min_threshold),
    unit_price: Number(values.unit_price),
    expiry_date: toApiDateString(values.expiry_date),
    batch_number: values.batch_number.trim(),
  });

  const saveMedicine = async (values: MedicineFormValues) => {
    setSavingMedicine(true);
    try {
      const payload = buildPayload(values);
      if (editingMedicineId) {
        await api.patch(`/clinic/medicines/${editingMedicineId}/`, payload);
        toast.success("Medicine updated");
      } else {
        await api.post("/clinic/medicines/", payload);
        toast.success("Medicine added");
      }
      resetMedicineForm();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not save medicine",
        ),
      );
    } finally {
      setSavingMedicine(false);
    }
  };

  const confirmDeleteMedicine = async () => {
    const medicine = pendingDeleteMedicine;
    if (!medicine) return;
    setDeletingMedicineId(medicine.id);
    try {
      await api.delete(`/clinic/medicines/${medicine.id}/`);
      toast.success("Medicine deleted");
      setPendingDeleteMedicine(null);
      if (editingMedicineId === medicine.id) resetMedicineForm();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not delete medicine",
        ),
      );
    } finally {
      setDeletingMedicineId(null);
    }
  };

  return (
    <ClinicShell
      title="Medicine inventory"
      subtitle="Govern pharmacy stock — low-stock thresholds feed the overview."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Medicines" value={medicines.length} tone="navy" />
        <StatTile label="Low stock alerts" value={lowStock.length} tone="rose" />
        <StatTile
          label={expiredCount > 0 ? "Expired SKUs" : "Active SKUs"}
          value={expiredCount > 0 ? expiredCount : activeCount}
          tone={expiredCount > 0 ? "orange" : "green"}
        />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <SectionCard
          id="medicine-form"
          kicker="Stock in"
          title={editingMedicineId ? "Edit medicine" : "Add medicine"}
          description={
            editingMedicineId
              ? "Update SKU details — pharmacy picks from active items only."
              : "New SKUs appear in the pharmacy dispense workflow when active."
          }
          action={editingMedicineId ? <StatusPill tone="orange">Editing</StatusPill> : undefined}
        >
          <form className="grid gap-5" onSubmit={medForm.handleSubmit(saveMedicine)}>
            <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-cta/5 px-4 py-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Package className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold text-primary">Pharmacy SKU</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Track category, batch, and expiry for regulated stock. Counts drop when pharmacy
                  confirms a dispense.
                </p>
              </div>
            </div>

            <CustomFormField
              control={medForm.control}
              name="name"
              fieldType={formFieldTypes.INPUT}
              label="Medicine name"
              placeholder="e.g. Amoxicillin 500mg"
            />

            <CustomFormField
              control={medForm.control}
              name="description"
              fieldType={formFieldTypes.TEXTAREA}
              label="Description (optional)"
              placeholder="Strength, form, or dispensing notes for pharmacy staff"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomFormField
                control={medForm.control}
                name="sku"
                fieldType={formFieldTypes.INPUT}
                label="SKU / code"
                placeholder="AMX-500"
              />
              <CustomFormField
                control={medForm.control}
                name="category"
                fieldType={formFieldTypes.SELECT}
                label="Category"
                options={MEDICINE_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomFormField
                control={medForm.control}
                name="unit_of_measure"
                fieldType={formFieldTypes.SELECT}
                label="Unit of measure"
                options={MEDICINE_UNITS.map((u) => ({ label: u.label, value: u.value }))}
              />
              <CustomFormField
                control={medForm.control}
                name="unit_price"
                fieldType={formFieldTypes.INPUT}
                type="number"
                label="Unit price (ETB)"
              />
            </div>

            <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
              <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Batch & expiry
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomFormField
                  control={medForm.control}
                  name="batch_number"
                  fieldType={formFieldTypes.INPUT}
                  label="Batch / lot number"
                  placeholder="Optional"
                />
                <CustomFormField
                  control={medForm.control}
                  name="expiry_date"
                  fieldType={formFieldTypes.CALENDAR}
                  label="Expiry date"
                  placeholder="Pick expiry date"
                  description="Leave unset if not tracked."
                  className="h-11 w-full justify-between rounded-xl px-3.5 font-normal"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
              <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Stock levels
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomFormField
                  control={medForm.control}
                  name="on_hand"
                  fieldType={formFieldTypes.INPUT}
                  type="number"
                  label="On hand"
                />
                <CustomFormField
                  control={medForm.control}
                  name="min_threshold"
                  fieldType={formFieldTypes.INPUT}
                  type="number"
                  label="Low-stock threshold"
                />
              </div>
            </div>

            <CustomFormField
              control={medForm.control}
              name="is_active"
              fieldType={formFieldTypes.SWITCH}
              label="Active in pharmacy"
              description="Inactive SKUs are hidden from new dispense picks."
            />

            <CustomFormField
              control={medForm.control}
              name="internal_notes"
              fieldType={formFieldTypes.TEXTAREA}
              label="Internal notes (staff only)"
              placeholder="Supplier, storage shelf, reorder contact…"
            />

            <div className="flex flex-wrap gap-2">
              {editingMedicineId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-xl"
                  disabled={savingMedicine}
                  onClick={resetMedicineForm}
                >
                  <X className="size-4" />
                  Cancel edit
                </Button>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={savingMedicine}
                className={cn("w-full sm:w-auto", ctaButtonClass)}
              >
                {editingMedicineId ? (
                  <>
                    <Check className="size-4" />
                    Update medicine
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Save medicine
                  </>
                )}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          kicker="On hand"
          title="Medicine catalog"
          description="Live stock pharmacy dispenses from — updates when Rx is confirmed."
          action={
            lowStock.length > 0 ? (
              <StatusPill tone="red">{lowStock.length} low</StatusPill>
            ) : (
              <StatusPill tone="green">Stock healthy</StatusPill>
            )
          }
        >
          {medicines.length === 0 ? (
            <EmptyState
              title="No medicines yet"
              hint="Add your first SKU above to enable pharmacy dispensing."
            />
          ) : (
            <div className={catalogScrollClass}>
              <div className="space-y-3 pr-1">
                {medicines.map((m) => {
                  const inactive = m.is_active === false;
                  const isLow = !inactive && m.on_hand <= m.min_threshold;
                  const expired = !inactive && isExpired(m.expiry_date);
                  const isEditing = editingMedicineId === m.id;
                  const expiryText = formatExpiry(m.expiry_date);

                  return (
                    <QueueItem
                      key={m.id}
                      className={cn(
                        inactive && "opacity-60",
                        isLow && "border-rose-200/80 bg-linear-to-r from-rose-50/40 to-white",
                        expired && "border-amber-200/80 bg-linear-to-r from-amber-50/50 to-white",
                        isEditing && "border-cta/35 bg-cta/5 shadow-md shadow-cta/10",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                            <Package className="size-4.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-heading font-semibold text-primary">{m.name}</p>
                              {inactive ? <StatusPill tone="muted">Inactive</StatusPill> : null}
                              {expired ? <StatusPill tone="orange">Expired</StatusPill> : null}
                              {isLow ? (
                                <AlertTriangle className="size-3.5 text-rose-600" />
                              ) : null}
                              {isEditing ? <StatusPill tone="orange">Editing</StatusPill> : null}
                            </div>
                            {m.description ? (
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {m.description}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {categoryLabel(m.category || "other")}
                              {m.sku ? ` · ${m.sku}` : ""} ·{" "}
                              {unitLabel(m.unit_of_measure || "tablet")} · {money(m.unit_price)} ETB
                            </p>
                            {m.batch_number || expiryText ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {m.batch_number ? `Batch ${m.batch_number}` : ""}
                                {m.batch_number && expiryText ? " · " : ""}
                                {expiryText ? `Exp ${expiryText}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <StatusPill tone={isLow ? "red" : "green"}>
                            {m.on_hand} {unitLabel(m.unit_of_measure || "tablet").toLowerCase()}
                          </StatusPill>
                          <div className="flex items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => startEditMedicine(m)}
                                >
                                  <Pencil className="size-4" />
                                  <span className="sr-only">Edit {m.name}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit medicine</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                  onClick={() => setPendingDeleteMedicine(m)}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Delete {m.name}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete SKU</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <AlertDialog
        open={pendingDeleteMedicine != null}
        onOpenChange={(open) => {
          if (!open && deletingMedicineId == null) setPendingDeleteMedicine(null);
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete medicine SKU?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">{pendingDeleteMedicine?.name}</span> from
              the catalog. Consider deactivating instead if you want to keep history visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMedicineId != null}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingMedicineId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteMedicine();
              }}
            >
              {deletingMedicineId != null ? "Deleting…" : "Delete medicine"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClinicShell>
  );
}
