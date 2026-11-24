"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageX, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/submit-button";
import { api, results } from "@/lib/api";
import type { Medicine, MedicineDamage } from "@/lib/clinic";
import {
  capacityFor,
  countWord,
  isSplittable,
  looseName,
  packName,
  stockText,
  type SaleUnit,
} from "@/lib/medicine-stock";
import { apiErrorDetail } from "@/lib/parallelBatch";
import { cn } from "@/lib/utils";

/**
 * Damaged stock for one medicine. Each entry is deducted from the inventory when saved;
 * changing an entry re-applies the difference, and deleting one puts the stock back.
 */
export function DamageDialog({
  medicine,
  onClose,
  onChanged,
}: {
  medicine: Medicine | null;
  onClose: () => void;
  /** Called after any change so the catalog can reload its stock numbers. */
  onChanged: () => Promise<void> | void;
}) {
  const [entries, setEntries] = useState<MedicineDamage[]>([]);
  const [editing, setEditing] = useState<MedicineDamage | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [saleUnit, setSaleUnit] = useState<SaleUnit>("pack");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // The dialog shows live stock, which changes as entries are saved.
  const [live, setLive] = useState<Medicine | null>(medicine);

  const medicineId = medicine?.id;

  const resetForm = useCallback(() => {
    setEditing(null);
    setQuantity("1");
    setSaleUnit("pack");
    setReason("");
    setError("");
  }, []);

  const load = useCallback(async () => {
    if (!medicineId) return;
    const [dmg, med] = await Promise.all([
      api.get("/clinic/medicine-damages/", { params: { medicine: medicineId, page_size: 100 } }),
      api.get<Medicine>(`/clinic/medicines/${medicineId}/`),
    ]);
    setEntries(results<MedicineDamage>(dmg.data));
    setLive(med.data);
  }, [medicineId]);

  useEffect(() => {
    setLive(medicine);
    resetForm();
    setEntries([]);
    if (medicineId) load().catch(() => toast.error("Could not load damage records"));
  }, [medicine, medicineId, load, resetForm]);

  if (!medicine || !live) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const split = isSplittable(live);
  const unitWord = saleUnit === "loose" ? looseName(live) : packName(live);
  const qty = Number(quantity);
  // While editing, the entry's own amount is still in the damage and could be put back.
  const cap = capacityFor(live, saleUnit);

  const startEdit = (entry: MedicineDamage) => {
    setEditing(entry);
    setQuantity(String(entry.quantity));
    setSaleUnit(entry.sale_unit);
    setReason(entry.reason);
    setError("");
  };

  const save = async () => {
    if (!Number.isInteger(qty) || qty < 1) {
      setError("Enter how many were damaged (a whole number, 1 or more).");
      return;
    }
    if (!editing && qty > cap) {
      setError(`Only ${stockText(live)} in stock.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { medicine: live.id, quantity: qty, sale_unit: saleUnit, reason: reason.trim() };
      if (editing) {
        await api.patch(`/clinic/medicine-damages/${editing.id}/`, body);
        toast.success("Damage record updated");
      } else {
        await api.post("/clinic/medicine-damages/", body);
        toast.success(`${countWord(unitWord, qty)} deducted as damaged`);
      }
      resetForm();
      await load();
      await onChanged();
    } catch (e) {
      const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldMsg = data?.quantity;
      setError(
        Array.isArray(fieldMsg) ? String(fieldMsg[0]) : apiErrorDetail(e, "Could not save the damage record"),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: MedicineDamage) => {
    try {
      await api.delete(`/clinic/medicine-damages/${entry.id}/`);
      toast.success("Damage record removed — stock restored");
      if (editing?.id === entry.id) resetForm();
      await load();
      await onChanged();
    } catch (e) {
      toast.error(apiErrorDetail(e, "Could not remove the record"));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="size-5 text-rose-600" />
            Damaged stock · {live.name}
          </DialogTitle>
          <DialogDescription>
            What you enter here is deducted from the inventory as damage. In stock now:{" "}
            <span className="font-semibold text-primary">{stockText(live)}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-2xl border border-rose-200/70 bg-rose-50/40 p-3.5">
          <p className="text-sm font-semibold text-primary">{editing ? "Edit damage record" : "Record damage"}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="damage-qty" className="text-xs font-semibold text-primary/80">
                How many
              </label>
              <Input
                id="damage-qty"
                type="number"
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 w-28 rounded-xl bg-white"
              />
            </div>
            {split ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-primary/80">Counted in</span>
                <div className="inline-flex rounded-xl border border-primary/15 bg-white p-0.5">
                  {(["pack", "loose"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setSaleUnit(u)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                        saleUnit === u ? "bg-rose-600 text-white shadow-sm" : "text-primary/70 hover:bg-rose-50",
                      )}
                    >
                      {u === "pack" ? packName(live) : looseName(live)}s
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="pb-2.5 text-sm font-medium text-primary/80">{packName(live)}s</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="damage-reason" className="text-xs font-semibold text-primary/80">
              Reason <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="damage-reason"
              value={reason}
              maxLength={255}
              placeholder="e.g. Broken in storage, water damage"
              onChange={(e) => setReason(e.target.value)}
              className="h-10 rounded-xl bg-white"
            />
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
          <div className="flex items-center justify-end gap-2">
            {editing ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
                <X className="size-4" />
                Cancel edit
              </Button>
            ) : null}
            <LoadingButton
              loading={saving}
              loadingLabel="Saving…"
              onClick={() => void save()}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <PackageX className="size-4" />
              {editing ? "Update damage" : "Deduct as damaged"}
            </LoadingButton>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Damage history ({entries.length})
          </p>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-primary/15 px-3 py-4 text-center text-sm text-muted-foreground">
              No damage recorded for this medicine.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white px-3 py-2.5",
                  editing?.id === entry.id && "border-rose-300 ring-2 ring-rose-200/60",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{entry.quantity_text}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {entry.recorded_by_name ? ` · ${entry.recorded_by_name}` : ""}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button type="button" size="icon-sm" variant="outline" className="rounded-xl" onClick={() => startEdit(entry)}>
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit damage record</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => void remove(entry)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete damage record</span>
                  </Button>
                </div>
              </div>
            ))
          )}
          <p className="text-[11px] text-muted-foreground">
            Deleting a record puts that amount back into stock, so use it to undo a mistaken entry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
