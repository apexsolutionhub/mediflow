"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/submit-button";
import { api } from "@/lib/api";
import type { BillableService, LabParameter } from "@/lib/clinic";

type Row = {
  name: string;
  result_type: "numeric" | "choice" | "text";
  unit: string;
  ref_low: string;
  ref_high: string;
  critical_low: string;
  critical_high: string;
  choices: string;
  abnormal_choices: string;
};

const blank = (): Row => ({
  name: "",
  result_type: "numeric",
  unit: "",
  ref_low: "",
  ref_high: "",
  critical_low: "",
  critical_high: "",
  choices: "",
  abnormal_choices: "",
});

const tidy = (v: string | null | undefined) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "" : String(Number(v));

const fromParam = (p: LabParameter): Row => ({
  name: p.name,
  result_type: p.result_type,
  unit: p.unit ?? "",
  ref_low: tidy(p.ref_low),
  ref_high: tidy(p.ref_high),
  critical_low: tidy(p.critical_low),
  critical_high: tidy(p.critical_high),
  choices: p.choices ?? "",
  abnormal_choices: p.abnormal_choices ?? "",
});

const inputClass =
  "h-9 w-full rounded-lg border border-primary/15 bg-white px-2.5 text-sm outline-none focus:ring-2 focus:ring-cta/20";

export function LabParameterEditor({
  service,
  onClose,
  onSaved,
}: {
  service: BillableService | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(service?.parameters?.length ? service.parameters.map(fromParam) : []);
  }, [service]);

  const patch = (i: number, change: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...change } : r)));

  const save = async () => {
    if (!service) return;
    if (rows.some((r) => !r.name.trim())) {
      toast.error("Every field needs a name");
      return;
    }
    const payload = rows.map((r) => ({
      name: r.name.trim(),
      result_type: r.result_type,
      unit: r.unit.trim(),
      choices: r.result_type === "choice" ? r.choices : "",
      abnormal_choices: r.result_type === "choice" ? r.abnormal_choices : "",
      ref_low: r.result_type === "numeric" && r.ref_low !== "" ? r.ref_low : null,
      ref_high: r.result_type === "numeric" && r.ref_high !== "" ? r.ref_high : null,
      critical_low: r.result_type === "numeric" && r.critical_low !== "" ? r.critical_low : null,
      critical_high: r.result_type === "numeric" && r.critical_high !== "" ? r.critical_high : null,
    }));
    setSaving(true);
    try {
      await api.put(`/clinic/services/${service.id}/parameters/`, payload);
      toast.success("Result fields saved");
      onSaved();
      onClose();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(detail || "Could not save result fields");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(service)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4" />
            Result fields — {service?.name}
          </DialogTitle>
          <DialogDescription>
            What the lab technician fills in for this test. Numeric fields are flagged
            Low/High/Critical automatically; choice fields (e.g. Negative, Positive) flag the
            abnormal answers. No fields = free-text result.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-primary/10 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_auto]">
                <input
                  className={inputClass}
                  placeholder="Name (e.g. Hemoglobin)"
                  value={r.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
                <Combobox
                  value={r.result_type}
                  onValueChange={(v) => patch(i, { result_type: v as Row["result_type"] })}
                  searchable={false}
                  options={[
                    { value: "numeric", label: "Number" },
                    { value: "choice", label: "Choice" },
                    { value: "text", label: "Short text" },
                  ]}
                />
                <input
                  className={inputClass}
                  placeholder="Unit"
                  value={r.unit}
                  onChange={(e) => patch(i, { unit: e.target.value })}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="text-rose-700"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove field</span>
                </Button>
              </div>
              {r.result_type === "numeric" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["ref_low", "Normal from"],
                      ["ref_high", "Normal to"],
                      ["critical_low", "Critical below"],
                      ["critical_high", "Critical above"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs text-muted-foreground">
                      {label}
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={r[key]}
                        onChange={(e) => patch(i, { [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              {r.result_type === "choice" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Choices (comma separated)
                    <input
                      className={inputClass}
                      placeholder="Negative, Positive"
                      value={r.choices}
                      onChange={(e) => patch(i, { choices: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Abnormal choices
                    <input
                      className={inputClass}
                      placeholder="Positive"
                      value={r.abnormal_choices}
                      onChange={(e) => patch(i, { abnormal_choices: e.target.value })}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setRows((prev) => [...prev, blank()])}
          >
            <Plus className="size-4" />
            Add field
          </Button>
        </div>

        <DialogFooter className="sticky -bottom-4 -mx-4 border-t border-primary/10 bg-popover px-4 pt-3 pb-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
            Save fields
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
