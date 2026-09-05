"use client";

import { useCallback, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import {
  BatchAddLineButton,
  BatchField,
  BatchLineCard,
} from "@/components/manager/batch-ops";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { api } from "@/lib/api";
import {
  apiErrorDetail,
  formatPoolFailures,
  newBatchLineKey,
  runWithConcurrency,
} from "@/lib/parallelBatch";

type DeptLine = { key: string; name: string };

function emptyDeptLine(): DeptLine {
  return { key: newBatchLineKey(), name: "" };
}

export function DepartmentBatchForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [lines, setLines] = useState<DeptLine[]>([emptyDeptLine()]);
  const [saving, setSaving] = useState(false);

  const updateLine = useCallback((key: string, name: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, name } : l)));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyDeptLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = lines
      .map((l) => ({ ...l, name: l.name.trim() }))
      .filter((l) => l.name.length > 0);
    if (valid.length === 0) {
      toast.error("Enter at least one department name");
      return;
    }

    setSaving(true);
    try {
      const { ok, failed } = await runWithConcurrency(valid, async (line) => {
        try {
          await api.post("/clinic/departments/", { name: line.name });
          return line.name;
        } catch (error: unknown) {
          throw new Error(apiErrorDetail(error, `Could not add ${line.name}`));
        }
      });

      if (ok.length > 0) {
        toast.success(
          `Added ${ok.length} department${ok.length === 1 ? "" : "s"}${
            failed.length ? ` (${failed.length} failed)` : ""
          }`,
        );
        setLines([emptyDeptLine()]);
        await onSaved();
      }
      if (failed.length) {
        toast.error(formatPoolFailures(failed) ?? "Some departments failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={(e) => void onSubmit(e)}>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-cta/5 px-4 py-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Building2 className="size-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-primary">
            Clinic departments (batch)
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add one or more departments in a single submit — e.g. Consultation, Laboratory,
            Imaging.
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
            <BatchField label="Department name" htmlFor={`dept-name-${line.key}`}>
              <Input
                id={`dept-name-${line.key}`}
                value={line.name}
                onChange={(e) => updateLine(line.key, e.target.value)}
                placeholder="e.g. Consultation"
                className="h-11 rounded-xl"
              />
            </BatchField>
          </BatchLineCard>
        ))}
        <BatchAddLineButton onClick={addLine} label="Add another department" disabled={saving} />
      </div>

      <SubmitButton
        variant="outline"
        className="h-11 w-full rounded-xl sm:w-auto"
        loading={saving}
        loadingLabel="Adding…"
      >
        <Building2 className="size-4" />
        Add {lines.filter((l) => l.name.trim()).length || ""} department
        {lines.filter((l) => l.name.trim()).length === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
