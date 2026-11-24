"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money, type Medicine } from "@/lib/clinic";
import { isSplittable, looseName, looseUnitPrice, packName, stockText } from "@/lib/medicine-stock";
import { cn } from "@/lib/utils";

/** Earliest expiry first; lines with no expiry date go last. */
export function sortByExpiry(batches: Medicine[]): Medicine[] {
  const time = (m: Medicine) => (m.expiry_date ? new Date(`${m.expiry_date.slice(0, 10)}T00:00:00`).getTime() : Infinity);
  return [...batches].sort((a, b) => time(a) - time(b) || a.id - b.id);
}

function expiryText(value?: string | null) {
  if (!value) return { label: "No expiry date", tone: "text-muted-foreground" };
  const end = new Date(`${value.slice(0, 10)}T23:59:59`).getTime();
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  const date = new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (days < 0) return { label: `${date} · expired`, tone: "text-rose-600" };
  if (days <= 30) return { label: `${date} · ${days}d left`, tone: "text-amber-700" };
  return { label: `${date} · ${days}d left`, tone: "text-emerald-700" };
}

/**
 * Several stock lines share this medicine's name (different batches or suppliers). The line
 * that expires first is preselected, so it is used up first; the doctor can pick another.
 */
export function BatchApprovalDialog({
  open,
  batches,
  currentId,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  batches: Medicine[];
  /** The batch already chosen for this line, when changing it. */
  currentId?: number | null;
  onConfirm: (batch: Medicine) => void;
  onCancel: () => void;
}) {
  const sorted = useMemo(() => sortByExpiry(batches), [batches]);
  const defaultId = sorted[0]?.id ?? null;
  const [selected, setSelected] = useState<number | null>(currentId ?? defaultId);

  useEffect(() => {
    if (open) setSelected(currentId ?? defaultId);
  }, [open, currentId, defaultId]);

  const chosen = sorted.find((b) => b.id === selected) ?? null;
  const name = sorted[0]?.name ?? "medicine";

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="size-5 text-(--role)" />
            Which batch of {name}?
          </DialogTitle>
          <DialogDescription>
            This medicine is in stock from {sorted.length} entries. By default the one that expires soonest is used
            first. Choose another if you need to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5" role="radiogroup" aria-label="Batch">
          {sorted.map((b, index) => {
            const isSelected = b.id === selected;
            const exp = expiryText(b.expiry_date);
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(b.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                  isSelected
                    ? "border-(--role)/50 bg-(--role)/8 ring-2 ring-(--role)/20"
                    : "border-primary/12 bg-white hover:border-primary/25 hover:bg-primary/2",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected ? "border-(--role) bg-(--role) text-white" : "border-primary/25",
                  )}
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-primary">Batch {b.batch_number || "—"}</span>
                    {index === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                        <CalendarClock className="size-3" />
                        Expires first
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{b.supplier_name || "No supplier"}</span>
                  <span className={cn("block text-xs font-semibold", exp.tone)}>{exp.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    In stock <span className="font-semibold text-primary">{stockText(b)}</span> ·{" "}
                    {money(b.unit_price)} ETB / {packName(b)}
                    {isSplittable(b) ? ` · ${money(looseUnitPrice(b))} / ${looseName(b)}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={!chosen} onClick={() => chosen && onConfirm(chosen)}>
            <Check className="size-4" />
            Use this batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
