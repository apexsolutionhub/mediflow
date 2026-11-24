"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Package, PackageX, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { StockLevelChart } from "@/components/charts/StockLevelChart";
import { DamageDialog } from "@/components/manager/DamageDialog";
import { MedicineGroup } from "@/components/manager/MedicineGroup";
import { MedicineLineDetail } from "@/components/manager/MedicineLineDetail";
import { MedicineFields } from "@/components/manager/MedicineFields";
import { MedicineIntakeForm } from "@/components/manager/MedicineIntakeForm";
import {
  draftErrorsAreEmpty,
  draftFromMedicine,
  draftToPayload,
  serverErrorsToDraft,
  validateDraft,
  type DraftErrors,
  type MedicineDraft,
} from "@/components/manager/medicine-draft";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/submit-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  EmptyState,
  QueueItem,
  ScrollableCatalog,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { MEDICINE_CATEGORIES, money, type Medicine, type Supplier } from "@/lib/clinic";
import { isSplittable, looseUnitPrice, stockText, unitLabel } from "@/lib/medicine-stock";
import { apiErrorDetail } from "@/lib/parallelBatch";
import { cn } from "@/lib/utils";

const categoryLabel = (value?: string) => MEDICINE_CATEGORIES.find((c) => c.value === value)?.label ?? "Uncategorized";

function expiryState(expiryDate?: string | null): "none" | "expired" | "soon" | "ok" {
  if (!expiryDate) return "none";
  const end = new Date(`${expiryDate.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return "none";
  const now = Date.now();
  if (end.getTime() < now) return "expired";
  return end.getTime() - now <= 30 * 24 * 60 * 60 * 1000 ? "soon" : "ok";
}

function formatExpiry(expiryDate?: string | null) {
  if (!expiryDate) return null;
  return new Date(`${expiryDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ManagerInventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [editing, setEditing] = useState<Medicine | null>(null);
  const [editDraft, setEditDraft] = useState<MedicineDraft | null>(null);
  const [editErrors, setEditErrors] = useState<DraftErrors>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Medicine | null>(null);
  const [damageFor, setDamageFor] = useState<Medicine | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMedicines = useCallback(async (force = false) => {
    setMedicines(
      await fetchClinicCatalog<Medicine>("medicines", "/clinic/medicines/", { page_size: 200 }, force),
    );
  }, []);

  const loadSuppliers = useCallback(async () => {
    const { data } = await api.get("/clinic/suppliers/", { params: { page_size: 200 } });
    setSuppliers(Array.isArray(data) ? data : (data.results ?? []));
  }, []);

  useEffect(() => {
    loadMedicines().catch(() => toast.error("Could not load inventory"));
    loadSuppliers().catch(() => toast.error("Could not load suppliers"));
  }, [loadMedicines, loadSuppliers]);

  // A line with no stock left is inactive and drops out of the lists.
  const active = useMemo(() => medicines.filter((m) => m.is_active !== false), [medicines]);
  // Same-name medicines (different batches or suppliers) are shown together.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: Medicine[] }>();
    for (const m of active) {
      const key = m.name.trim().toLowerCase();
      const g = map.get(key) ?? { key, name: m.name.trim(), items: [] };
      g.items.push(m);
      map.set(key, g);
    }
    return [...map.values()];
  }, [active]);
  const lowStock = useMemo(() => active.filter((m) => m.on_hand <= m.min_threshold), [active]);
  const expiredCount = useMemo(() => active.filter((m) => expiryState(m.expiry_date) === "expired").length, [active]);
  const creditDue = useMemo(
    () => medicines.reduce((sum, m) => sum + Number(m.credit_amount ?? 0), 0),
    [medicines],
  );

  // ---------- edit ----------
  const startEdit = (m: Medicine) => {
    setEditing(m);
    setEditDraft(draftFromMedicine(m));
    setEditErrors({});
  };
  const closeEdit = () => {
    setEditing(null);
    setEditDraft(null);
    setEditErrors({});
  };

  const saveEdit = async () => {
    if (!editing || !editDraft) return;
    const errors = validateDraft(editDraft, { mode: "edit", original: editing });
    setEditErrors(errors);
    if (!draftErrorsAreEmpty(errors)) {
      toast.error("Fix the highlighted fields");
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch(`/clinic/medicines/${editing.id}/`, draftToPayload(editDraft, { mode: "edit", original: editing }));
      toast.success("Medicine updated");
      closeEdit();
      await loadMedicines(true);
    } catch (error) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors = serverErrorsToDraft(data && !("detail" in data) ? data : undefined);
      if (Object.keys(fieldErrors).length) setEditErrors(fieldErrors);
      toast.error(apiErrorDetail(error, "Could not save medicine"));
    } finally {
      setSavingEdit(false);
    }
  };

  // ---------- delete ----------
  const confirmDelete = async () => {
    const medicine = pendingDelete;
    if (!medicine) return;
    setDeletingId(medicine.id);
    try {
      await api.delete(`/clinic/medicines/${medicine.id}/`);
      toast.success("Medicine deleted");
      setPendingDelete(null);
      await loadMedicines(true);
    } catch (error) {
      toast.error(apiErrorDetail(error, "Could not delete medicine"));
      setPendingDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const renderEntry = (m: Medicine) => {
    const isLow = m.on_hand <= m.min_threshold;
    const expiry = expiryState(m.expiry_date);
    const expiryText = formatExpiry(m.expiry_date);
    const credit = Number(m.credit_amount ?? 0);
    const split = isSplittable(m);
    return (
      <QueueItem
        key={m.id}
        className={cn(
          isLow && "border-rose-200/80 bg-linear-to-r from-rose-50/40 to-white",
          expiry === "expired" && "border-amber-200/80 bg-linear-to-r from-amber-50/50 to-white",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MedicineLineDetail medicine={m} className="flex min-w-0 flex-1 basis-64 items-start gap-3">
            {m.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image_url} alt={m.name} className="size-11 shrink-0 rounded-xl border object-cover" />
            ) : (
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                <Package className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading font-semibold text-primary">{m.name}</p>
                {expiry === "expired" ? <StatusPill tone="red">Expired</StatusPill> : null}
                {expiry === "soon" ? <StatusPill tone="orange">Expires soon</StatusPill> : null}
                {isLow ? <AlertTriangle className="size-3.5 text-rose-600" /> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {categoryLabel(m.category)}
                {m.supplier_name ? ` · ${m.supplier_name}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">
                  {money(m.unit_price)} ETB / {unitLabel(m.unit_of_measure).toLowerCase()}
                </span>
                {split ? ` · ${money(looseUnitPrice(m))} ETB / ${(m.loose_unit || "piece").toLowerCase()}` : ""}
                {Number(m.cost) > 0 ? ` · cost ${money(m.cost ?? 0)}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.batch_number ? `Batch ${m.batch_number}` : ""}
                {m.batch_number && expiryText ? " · " : ""}
                {expiryText ? `Exp ${expiryText}` : ""}
              </p>
              {m.description ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{m.description}</p>
              ) : null}
            </div>
          </MedicineLineDetail>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusPill tone={isLow ? "red" : "green"}>{m.stock_text || stockText(m)}</StatusPill>
            {credit > 0.005 ? (
              <StatusPill tone="orange">{money(credit)} ETB owed</StatusPill>
            ) : (
              <StatusPill tone="green">Paid</StatusPill>
            )}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => setDamageFor(m)}
                  >
                    <PackageX className="size-4" />
                    <span className="sr-only">Record damage for {m.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Damaged stock</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" size="icon-sm" variant="outline" className="rounded-xl" onClick={() => startEdit(m)}>
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
                    onClick={() => setPendingDelete(m)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete {m.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete stock line</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </QueueItem>
    );
  };

  return (
    <ClinicShell
      title="Medicine inventory"
      subtitle="Register stock and credit — pharmacy dispenses from what is registered here."
    >
      <div className="flex w-full flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Medicines" value={active.length} tone="navy" />
          <StatTile label="Low stock alerts" value={lowStock.length} tone="rose" />
          <StatTile
            label={expiredCount > 0 ? "Expired lines" : "Active lines"}
            value={expiredCount > 0 ? expiredCount : active.length}
            tone={expiredCount > 0 ? "orange" : "green"}
          />
          <StatTile
            label="Owed to suppliers"
            value={`${money(creditDue)} ETB`}
            tone={creditDue > 0.005 ? "orange" : "green"}
            icon={Wallet}
          />
        </div>

        <SectionCard
          className="order-1"
          kicker="Stock health"
          title="Closest to running out"
          description="Whole packs on hand against the reorder level, lowest cover first."
        >
          <StockLevelChart medicines={active} />
        </SectionCard>

        <SectionCard
          className="order-1"
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
          {active.length === 0 ? (
            <EmptyState title="No medicines in stock" hint="Register your first stock line below to enable prescribing and dispensing." />
          ) : (
            <ScrollableCatalog itemCount={active.length}>
              <div className="space-y-3">
                {groups.map((g) =>
                  g.items.length === 1 ? (
                    renderEntry(g.items[0])
                  ) : (
                    <MedicineGroup key={g.key} name={g.name} items={g.items} renderEntry={renderEntry} />
                  ),
                )}
              </div>
            </ScrollableCatalog>
          )}
        </SectionCard>

        <SectionCard
          id="medicine-form"
          className="order-2"
          kicker="Stock in"
          title="Register medicines"
          description="Add one or many stock lines in a single submit. They appear in prescribing and pharmacy straight away."
        >
          <MedicineIntakeForm
            suppliers={suppliers}
            onSaved={() => loadMedicines(true)}
          />
        </SectionCard>
      </div>

      <DamageDialog
        medicine={damageFor}
        onClose={() => setDamageFor(null)}
        onChanged={() => loadMedicines(true)}
      />

      {/* Edit dialog: the same fields as registration */}
      <Dialog open={editing !== null} onOpenChange={(open) => (!open && !savingEdit ? closeEdit() : undefined)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit medicine</DialogTitle>
            <DialogDescription>Update product, supplier, stock and payment details.</DialogDescription>
          </DialogHeader>
          {editing && editDraft ? (
            <MedicineFields
              draft={editDraft}
              errors={editErrors}
              suppliers={suppliers}
              original={editing}
              mode="edit"
              disabled={savingEdit}
              onChange={(change) => {
                setEditDraft((d) => (d ? { ...d, ...change } : d));
                setEditErrors((prev) => {
                  const next = { ...prev };
                  for (const k of Object.keys(change) as (keyof MedicineDraft)[]) delete next[k];
                  return next;
                });
              }}
            />
          ) : null}
          <DialogFooter className="sticky -bottom-4 -mx-4 border-t border-primary/10 bg-popover px-4 pt-3 pb-1">
            <Button type="button" variant="ghost" onClick={closeEdit} disabled={savingEdit}>
              Cancel
            </Button>
            <LoadingButton loading={savingEdit} loadingLabel="Saving…" onClick={() => void saveEdit()}>
              <Check className="size-4" />
              Update medicine
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => (!open && deletingId == null ? setPendingDelete(null) : undefined)}>
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this stock line?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium text-foreground">{pendingDelete?.name}</span>
              {pendingDelete?.batch_number ? ` (batch ${pendingDelete.batch_number})` : ""} from the catalog. It can&apos;t
              be undone. A line that still owes money to its supplier can&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deletingId != null ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ClinicShell>
  );
}
