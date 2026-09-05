"use client";

import { useCallback, useState } from "react";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  BatchAddLineButton,
  BatchField,
  BatchLineCard,
} from "@/components/manager/batch-ops";
import { DatePicker } from "@/components/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Switch } from "@/components/ui/switch";
import { ctaButtonClass } from "@/components/ui-chrome";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { MEDICINE_CATEGORIES, MEDICINE_UNITS } from "@/lib/clinic";
import {
  apiErrorDetail,
  formatPoolFailures,
  newBatchLineKey,
  runWithConcurrency,
} from "@/lib/parallelBatch";

type MedicineLine = {
  key: string;
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

function emptyMedicineLine(): MedicineLine {
  return {
    key: newBatchLineKey(),
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
  };
}

function toApiDateString(value: Date | null | undefined): string | null {
  if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function MedicineBatchForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [lines, setLines] = useState<MedicineLine[]>([emptyMedicineLine()]);
  const [saving, setSaving] = useState(false);

  const patchLine = useCallback((key: string, patch: Partial<MedicineLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyMedicineLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = lines.filter((l) => l.name.trim().length > 0);
    if (valid.length === 0) {
      toast.error("Enter at least one medicine name");
      return;
    }

    setSaving(true);
    try {
      const { ok, failed } = await runWithConcurrency(valid, async (line) => {
        const payload = {
          name: line.name.trim(),
          description: line.description.trim(),
          sku: line.sku.trim(),
          category: line.category,
          batch_number: line.batch_number.trim(),
          expiry_date: toApiDateString(line.expiry_date),
          unit_of_measure: line.unit_of_measure,
          on_hand: Number(line.on_hand),
          min_threshold: Number(line.min_threshold),
          unit_price: Number(line.unit_price),
          is_active: line.is_active,
          internal_notes: line.internal_notes.trim(),
        };
        try {
          await api.post("/clinic/medicines/", payload);
          return payload.name;
        } catch (error: unknown) {
          throw new Error(apiErrorDetail(error, `Could not add ${payload.name}`));
        }
      });

      if (ok.length > 0) {
        toast.success(
          `Added ${ok.length} medicine${ok.length === 1 ? "" : "s"}${
            failed.length ? ` (${failed.length} failed)` : ""
          }`,
        );
        setLines([emptyMedicineLine()]);
        await onSaved();
      }
      if (failed.length) {
        toast.error(formatPoolFailures(failed) ?? "Some medicines failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const filled = lines.filter((l) => l.name.trim()).length;

  return (
    <form className="grid gap-5" onSubmit={(e) => void onSubmit(e)}>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-cta/5 px-4 py-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Package className="size-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-primary">
            Pharmacy SKUs (batch)
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Register multiple medicines in one submit — each line has its own batch, expiry, and
            stock levels.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <BatchLineCard
            key={line.key}
            index={index}
            canRemove={lines.length > 1}
            onRemove={() => removeLine(line.key)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <BatchField
                label="Medicine name"
                htmlFor={`med-name-${line.key}`}
                className="sm:col-span-2"
              >
                <Input
                  id={`med-name-${line.key}`}
                  value={line.name}
                  onChange={(e) => patchLine(line.key, { name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="h-11 rounded-xl"
                />
              </BatchField>
              <BatchField label="SKU / code" htmlFor={`med-sku-${line.key}`}>
                <Input
                  id={`med-sku-${line.key}`}
                  value={line.sku}
                  onChange={(e) => patchLine(line.key, { sku: e.target.value })}
                  placeholder="AMX-500"
                  className="h-11 rounded-xl"
                />
              </BatchField>
              <BatchField label="Category">
                <Select
                  value={line.category}
                  onValueChange={(v) => patchLine(line.key, { category: v })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICINE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BatchField>
              <BatchField label="Unit of measure">
                <Select
                  value={line.unit_of_measure}
                  onValueChange={(v) => patchLine(line.key, { unit_of_measure: v })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICINE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BatchField>
              <BatchField label="Unit price (ETB)" htmlFor={`med-price-${line.key}`}>
                <Input
                  id={`med-price-${line.key}`}
                  type="number"
                  value={line.unit_price}
                  onChange={(e) =>
                    patchLine(line.key, { unit_price: Number(e.target.value) || 0 })
                  }
                  className="h-11 rounded-xl tabular-nums"
                />
              </BatchField>
              <BatchField label="Batch / lot" htmlFor={`med-batch-${line.key}`}>
                <Input
                  id={`med-batch-${line.key}`}
                  value={line.batch_number}
                  onChange={(e) => patchLine(line.key, { batch_number: e.target.value })}
                  placeholder="Optional"
                  className="h-11 rounded-xl"
                />
              </BatchField>
              <BatchField label="Expiry date">
                <DatePicker
                  value={line.expiry_date}
                  onChange={(date) => patchLine(line.key, { expiry_date: date ?? null })}
                  placeholder="Pick expiry date"
                />
              </BatchField>
              <BatchField label="On hand" htmlFor={`med-onhand-${line.key}`}>
                <Input
                  id={`med-onhand-${line.key}`}
                  type="number"
                  value={line.on_hand}
                  onChange={(e) =>
                    patchLine(line.key, { on_hand: Number(e.target.value) || 0 })
                  }
                  className="h-11 rounded-xl tabular-nums"
                />
              </BatchField>
              <BatchField label="Low-stock threshold" htmlFor={`med-min-${line.key}`}>
                <Input
                  id={`med-min-${line.key}`}
                  type="number"
                  value={line.min_threshold}
                  onChange={(e) =>
                    patchLine(line.key, { min_threshold: Number(e.target.value) || 0 })
                  }
                  className="h-11 rounded-xl tabular-nums"
                />
              </BatchField>
              <BatchField
                label="Description (optional)"
                htmlFor={`med-desc-${line.key}`}
                className="sm:col-span-2"
              >
                <Textarea
                  id={`med-desc-${line.key}`}
                  value={line.description}
                  onChange={(e) => patchLine(line.key, { description: e.target.value })}
                  placeholder="Strength, form, or dispensing notes"
                  className="min-h-20 rounded-xl"
                />
              </BatchField>
            </div>

            <label className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-slate-50/60 px-3 py-2 text-sm">
              <span>Active in pharmacy</span>
              <Switch
                checked={line.is_active}
                onCheckedChange={(v) => patchLine(line.key, { is_active: v })}
              />
            </label>
          </BatchLineCard>
        ))}
        <BatchAddLineButton onClick={addLine} label="Add another medicine" disabled={saving} />
      </div>

      <SubmitButton
        size="lg"
        disabled={saving}
        className={cn("w-full sm:w-auto", ctaButtonClass)}
        loading={saving}
        loadingLabel="Saving…"
      >
        <Plus className="size-4" />
        Save {filled || ""} medicine{filled === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
