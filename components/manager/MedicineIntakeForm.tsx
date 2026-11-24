"use client";

import { useCallback, useState } from "react";
import { Layers } from "lucide-react";
import { toast } from "sonner";

import { BatchAddLineButton, BatchLineCard } from "@/components/manager/batch-ops";
import { MedicineFields } from "@/components/manager/MedicineFields";
import {
  draftErrorsAreEmpty,
  draftToPayload,
  emptyDraft,
  lineCredit,
  lineTotal,
  serverErrorsToDraft,
  validateDraft,
  type DraftErrors,
  type MedicineDraft,
} from "@/components/manager/medicine-draft";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { money, type Supplier } from "@/lib/clinic";
import { apiErrorDetail, newBatchLineKey } from "@/lib/parallelBatch";
import { cn } from "@/lib/utils";

type Line = { key: string; draft: MedicineDraft; errors: DraftErrors };

const newLine = (): Line => ({ key: newBatchLineKey(), draft: emptyDraft(), errors: {} });

/** "Medicine intake": register one or many stock lines in a single, all-or-nothing submit. */
export function MedicineIntakeForm({
  suppliers,
  onSaved,
}: {
  suppliers: Supplier[];
  onSaved: () => Promise<void>;
}) {
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const patch = useCallback((key: string, change: Partial<MedicineDraft>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        // Editing a field clears its own error.
        const errors = { ...l.errors };
        for (const field of Object.keys(change) as (keyof MedicineDraft)[]) delete errors[field];
        return { ...l, draft: { ...l.draft, ...change }, errors };
      }),
    );
  }, []);

  const totals = lines.reduce(
    (acc, l) => ({
      units: acc.units + (Number(l.draft.on_hand) || 0),
      cost: acc.cost + lineTotal(l.draft),
      credit: acc.credit + lineCredit(l.draft),
    }),
    { units: 0, cost: 0, credit: 0 },
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const checked = lines.map((l) => ({ ...l, errors: validateDraft(l.draft, { mode: "intake" }) }));
    setLines(checked);
    const firstBad = checked.findIndex((l) => !draftErrorsAreEmpty(l.errors));
    if (firstBad >= 0) {
      toast.error(`Line ${firstBad + 1}: fix the highlighted fields`);
      document.getElementById(`intake-line-${checked[firstBad].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      const items = checked.map((l) => draftToPayload(l.draft, { mode: "intake" }));
      await api.post("/clinic/medicines/batch/", { items });
      toast.success(`${items.length} medicine line${items.length === 1 ? "" : "s"} registered`);
      setLines([newLine()]);
      await onSaved();
    } catch (error) {
      const data = (error as { response?: { data?: { errors?: { line: number; errors: Record<string, unknown> }[] } } })
        ?.response?.data;
      if (data?.errors?.length) {
        // The server saved nothing, so every line stays and the bad ones show why.
        setLines((prev) =>
          prev.map((l, i) => {
            const hit = data.errors?.find((e) => e.line === i + 1);
            return hit ? { ...l, errors: serverErrorsToDraft(hit.errors) } : l;
          }),
        );
        toast.error(`${data.errors.length} line(s) need fixing. Nothing was saved.`);
      } else {
        toast.error(apiErrorDetail(error, "Could not register medicines"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-(--role)/8 px-4 py-3.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
          <Layers className="size-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-primary">Medicine intake</p>
          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
            Register several stock lines at once. If any line has a problem, nothing is saved, so you can fix it and
            submit again without duplicating stock.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {lines.map((line, index) => (
          <div key={line.key} id={`intake-line-${line.key}`}>
            <BatchLineCard
              index={index}
              canRemove={lines.length > 1}
              onRemove={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== line.key)))}
              className={cn(!draftErrorsAreEmpty(line.errors) && "border-rose-300 ring-rose-200/60")}
            >
              <MedicineFields
                draft={line.draft}
                errors={line.errors}
                suppliers={suppliers}
                onChange={(change) => patch(line.key, change)}
                mode="intake"
                disabled={saving}
              />
            </BatchLineCard>
          </div>
        ))}
      </div>

      <BatchAddLineButton onClick={() => setLines((prev) => [...prev, newLine()])} disabled={saving} label="Add another medicine line" />

      <div className="flex flex-col gap-3 border-t border-primary/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>
            Lines <b className="text-primary">{lines.length}</b>
          </span>
          <span>
            Units <b className="text-primary">{totals.units}</b>
          </span>
          <span>
            Total cost <b className="text-primary">{money(totals.cost)} ETB</b>
          </span>
          {totals.credit > 0.005 ? (
            <span className="font-semibold text-rose-600">Credit due {money(totals.credit)} ETB</span>
          ) : null}
        </div>
        <SubmitButton
          size="lg"
          className={cn("w-full sm:w-auto", ctaButtonClass)}
          loading={saving}
          loadingLabel="Registering…"
        >
          Register {lines.length} line{lines.length === 1 ? "" : "s"}
        </SubmitButton>
      </div>

    </form>
  );
}
