"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import {
  BatchAddLineButton,
  BatchField,
  BatchLineCard,
} from "@/components/manager/batch-ops";
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
import { BILLABLE_SERVICE_TYPES } from "@/lib/clinic";
import {
  apiErrorDetail,
  formatPoolFailures,
  newBatchLineKey,
  runWithConcurrency,
} from "@/lib/parallelBatch";

export type ServiceBatchLine = {
  key: string;
  code: string;
  name: string;
  description: string;
  department: string;
  service_type: string;
  unit_price: number;
  default_quantity: number;
  is_active: boolean;
  auto_add_on_registration: boolean;
  requires_payment_before_work: boolean;
  internal_notes: string;
};

function emptyServiceLine(department: string): ServiceBatchLine {
  return {
    key: newBatchLineKey(),
    code: "",
    name: "",
    description: "",
    department,
    service_type: "other",
    unit_price: 100,
    default_quantity: 1,
    is_active: true,
    auto_add_on_registration: false,
    requires_payment_before_work: true,
    internal_notes: "",
  };
}

export function ServiceBatchForm({
  departmentOptions,
  defaultDepartment,
  preferredDepartment,
  autoAddHint,
  onSaved,
}: {
  departmentOptions: { label: string; value: string }[];
  defaultDepartment: string;
  preferredDepartment?: string;
  autoAddHint?: string;
  onSaved: () => Promise<void>;
}) {
  const [lines, setLines] = useState<ServiceBatchLine[]>([
    emptyServiceLine(defaultDepartment),
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preferredDepartment) return;
    setLines((prev) =>
      prev.map((l, i) => (i === 0 ? { ...l, department: preferredDepartment } : l)),
    );
  }, [preferredDepartment]);

  useEffect(() => {
    if (!defaultDepartment) return;
    setLines((prev) =>
      prev.map((l) =>
        departmentOptions.some((o) => o.value === l.department)
          ? l
          : { ...l, department: defaultDepartment },
      ),
    );
  }, [defaultDepartment, departmentOptions]);

  const patchLine = useCallback((key: string, patch: Partial<ServiceBatchLine>) => {
    setLines((prev) => {
      const next = prev.map((l) => (l.key === key ? { ...l, ...patch } : l));
      if (patch.auto_add_on_registration === true) {
        return next.map((l) =>
          l.key === key ? l : { ...l, auto_add_on_registration: false },
        );
      }
      return next;
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      emptyServiceLine(prev[0]?.department || defaultDepartment),
    ]);
  }, [defaultDepartment]);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = lines.filter((l) => l.name.trim().length > 0);
    if (valid.length === 0) {
      toast.error("Enter at least one service name");
      return;
    }
    for (const line of valid) {
      if (!line.department) {
        toast.error(`Pick a department for “${line.name.trim()}”`);
        return;
      }
    }

    setSaving(true);
    try {
      const { ok, failed } = await runWithConcurrency(valid, async (line) => {
        const payload = {
          code: line.code.trim() || line.name.trim().slice(0, 12).toUpperCase().replace(/\s+/g, "-"),
          name: line.name.trim(),
          description: line.description.trim(),
          department: line.department,
          service_type: line.service_type,
          unit_price: Number(line.unit_price),
          default_quantity: Math.max(1, Number(line.default_quantity) || 1),
          is_active: line.is_active,
          auto_add_on_registration: line.auto_add_on_registration,
          requires_payment_before_work: line.requires_payment_before_work,
          internal_notes: line.internal_notes.trim(),
        };
        try {
          await api.post("/clinic/services/", payload);
          return payload.name;
        } catch (error: unknown) {
          throw new Error(apiErrorDetail(error, `Could not add ${payload.name}`));
        }
      });

      if (ok.length > 0) {
        toast.success(
          `Added ${ok.length} service${ok.length === 1 ? "" : "s"}${
            failed.length ? ` (${failed.length} failed)` : ""
          }`,
        );
        setLines([emptyServiceLine(defaultDepartment)]);
        await onSaved();
      }
      if (failed.length) {
        toast.error(formatPoolFailures(failed) ?? "Some services failed");
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
          <Tags className="size-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-primary">
            Billable services (batch)
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add multiple catalog lines in one submit. Each line has its own code, price, and
            department.
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
              <BatchField label="Service name" htmlFor={`svc-name-${line.key}`} className="sm:col-span-2">
                <Input
                  id={`svc-name-${line.key}`}
                  value={line.name}
                  onChange={(e) => patchLine(line.key, { name: e.target.value })}
                  placeholder="e.g. General consultation"
                  className="h-11 rounded-xl"
                />
              </BatchField>
              <BatchField label="Code" htmlFor={`svc-code-${line.key}`}>
                <Input
                  id={`svc-code-${line.key}`}
                  value={line.code}
                  onChange={(e) => patchLine(line.key, { code: e.target.value })}
                  placeholder="CONSULT"
                  className="h-11 rounded-xl"
                />
              </BatchField>
              <BatchField label="Unit price (ETB)" htmlFor={`svc-price-${line.key}`}>
                <Input
                  id={`svc-price-${line.key}`}
                  type="number"
                  value={line.unit_price}
                  onChange={(e) =>
                    patchLine(line.key, { unit_price: Number(e.target.value) || 0 })
                  }
                  className="h-11 rounded-xl tabular-nums"
                />
              </BatchField>
              <BatchField label="Department">
                <Select
                  value={line.department}
                  onValueChange={(v) => patchLine(line.key, { department: v })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BatchField>
              <BatchField label="Service type">
                <Select
                  value={line.service_type}
                  onValueChange={(v) => patchLine(line.key, { service_type: v })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLABLE_SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BatchField>
              <BatchField label="Default quantity" htmlFor={`svc-qty-${line.key}`}>
                <Input
                  id={`svc-qty-${line.key}`}
                  type="number"
                  min={1}
                  value={line.default_quantity}
                  onChange={(e) =>
                    patchLine(line.key, {
                      default_quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="h-11 rounded-xl tabular-nums"
                />
              </BatchField>
              <BatchField
                label="Description (optional)"
                htmlFor={`svc-desc-${line.key}`}
                className="sm:col-span-2"
              >
                <Textarea
                  id={`svc-desc-${line.key}`}
                  value={line.description}
                  onChange={(e) => patchLine(line.key, { description: e.target.value })}
                  placeholder="Patient-facing label"
                  className="min-h-20 rounded-xl"
                />
              </BatchField>
            </div>

            <div className="grid gap-3 rounded-xl border border-primary/10 bg-slate-50/60 p-3 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>Active</span>
                <Switch
                  checked={line.is_active}
                  onCheckedChange={(v) => patchLine(line.key, { is_active: v })}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>Pay before work</span>
                <Switch
                  checked={line.requires_payment_before_work}
                  onCheckedChange={(v) =>
                    patchLine(line.key, { requires_payment_before_work: v })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm sm:col-span-1">
                <span title={autoAddHint}>Auto-add on registration</span>
                <Switch
                  checked={line.auto_add_on_registration}
                  onCheckedChange={(v) =>
                    patchLine(line.key, { auto_add_on_registration: v })
                  }
                />
              </label>
            </div>
          </BatchLineCard>
        ))}
        <BatchAddLineButton onClick={addLine} label="Add another service" disabled={saving} />
      </div>

      <SubmitButton
        size="lg"
        disabled={saving}
        className={cn("w-full sm:w-auto", ctaButtonClass)}
        loading={saving}
        loadingLabel="Saving…"
      >
        <Plus className="size-4" />
        Save {filled || ""} service{filled === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
