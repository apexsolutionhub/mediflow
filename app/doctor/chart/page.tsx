"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FileText, Lock, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, QueueItem, SectionCard, StatusPill } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type ChartValues = {
  chief_complaint: string;
  examination: string;
  diagnosis: string;
  clinical_notes: string;
  treatment_plan: string;
};

function chartHasContent(chart: ChartValues | null | undefined) {
  if (!chart) return false;
  return Boolean(
    chart.chief_complaint?.trim() ||
      chart.examination?.trim() ||
      chart.diagnosis?.trim() ||
      chart.clinical_notes?.trim() ||
      chart.treatment_plan?.trim(),
  );
}

/** Orders without a returned result keep the chart locked; results reopen it for updates. */
function orderBlocksChartEdit(order: {
  order_type?: string;
  status?: string;
  result_text?: string;
  fulfillment?: string;
}) {
  const status = String(order.status || "").toLowerCase();
  if (["completed", "reviewed", "dispensed"].includes(status)) return false;
  if ((order.result_text || "").trim()) return false;
  // Outside-pharmacy Rx has no unit result workflow — do not keep the chart locked.
  if (
    String(order.order_type || "").toLowerCase() === "prescription" &&
    String(order.fulfillment || "") === "external_print"
  ) {
    return false;
  }
  return true;
}

export default function DoctorChartPage() {
  const { encounters, current, selectedId, setSelectedId, load } = useEncounterBoard("doctor");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const chartForm = useForm<ChartValues>({
    defaultValues: {
      chief_complaint: "",
      examination: "",
      diagnosis: "",
      clinical_notes: "",
      treatment_plan: "",
    },
  });

  const hasChart = chartHasContent(current?.chart);
  const orders = current?.orders ?? [];
  const pendingOrderLock = orders.some(orderBlocksChartEdit);
  const hasResultsBack = orders.some(
    (o) =>
      ["completed", "reviewed", "dispensed"].includes(String(o.status || "").toLowerCase()) ||
      Boolean((o.result_text || "").trim()),
  );
  const isClosed = String(current?.status || "").toLowerCase() === "closed";
  /** Locked while orders await results; editable again after results return (until checkout). */
  const canEdit = Boolean(current) && !isClosed && !pendingOrderLock;
  const showForm = Boolean(current) && (!hasChart || editing) && canEdit;

  useEffect(() => {
    if (!current) return;
    chartForm.reset({
      chief_complaint: current.chart?.chief_complaint || "",
      examination: current.chart?.examination || "",
      diagnosis: current.chart?.diagnosis || "",
      clinical_notes: current.chart?.clinical_notes || "",
      treatment_plan: current.chart?.treatment_plan || "",
    });
    setEditing(false);
  }, [current, chartForm]);

  const lockReason = useMemo(() => {
    if (isClosed) return "Checked out — clinical record is history only.";
    if (pendingOrderLock) {
      return "Orders are in progress — chart unlocks again when results are returned.";
    }
    return null;
  }, [isClosed, pendingOrderLock]);

  return (
    <ClinicShell
      title="Chart"
      subtitle="Assessment stays editable until checkout. Sending an order locks it temporarily; when results come back you can update the chart again."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {current ? (
        <div className="grid gap-6 xl:grid-cols-5">
          <SectionCard
            kicker="Clinical record"
            title={`Chart · ${current.patient.full_name}`}
            description={`${current.patient.mrn}${current.patient.allergies ? ` · Allergies: ${current.patient.allergies}` : ""}`}
            className="xl:col-span-3"
            action={
              hasChart ? (
                <StatusPill tone={canEdit ? "green" : "muted"}>
                  {isClosed
                    ? "History"
                    : pendingOrderLock
                      ? "Awaiting results"
                      : hasResultsBack
                        ? "Open after results"
                        : "Active"}
                </StatusPill>
              ) : undefined
            }
          >
            {lockReason ? (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-primary/10 bg-slate-50/80 px-3 py-2.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                {lockReason}
              </div>
            ) : null}

            {showForm ? (
              <form
                className="grid gap-4"
                onSubmit={chartForm.handleSubmit(async (values) => {
                  if (!current) return;
                  if (!values.diagnosis.trim()) {
                    toast.error("Diagnosis is required for the clinical assessment.");
                    return;
                  }
                  setSaving(true);
                  try {
                    await api.post("/clinic/charts/", { encounter: current.id, ...values });
                    toast.success(hasChart ? "Chart updated" : "Chart assessment saved");
                    setEditing(false);
                    await load(true);
                  } finally {
                    setSaving(false);
                  }
                })}
              >
                <CustomFormField
                  control={chartForm.control}
                  name="chief_complaint"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Chief complaint"
                />
                <CustomFormField
                  control={chartForm.control}
                  name="examination"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Examination"
                />
                <CustomFormField
                  control={chartForm.control}
                  name="diagnosis"
                  fieldType={formFieldTypes.INPUT}
                  label="Diagnosis"
                />
                <CustomFormField
                  control={chartForm.control}
                  name="clinical_notes"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Clinical notes"
                />
                <CustomFormField
                  control={chartForm.control}
                  name="treatment_plan"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Treatment plan (optional printable)"
                />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className={ctaButtonClass} loading={saving} loadingLabel="Saving…">
                    <Save className="size-4" />
                    {hasChart ? "Update chart" : "Save assessment"}
                  </SubmitButton>
                  {hasChart ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : hasChart ? (
              <div className={cn("space-y-4", !canEdit && "opacity-95")}>
                {(
                  [
                    ["Chief complaint", current.chart?.chief_complaint],
                    ["Examination", current.chart?.examination],
                    ["Diagnosis", current.chart?.diagnosis],
                    ["Clinical notes", current.chart?.clinical_notes],
                    ["Treatment plan", current.chart?.treatment_plan],
                  ] as const
                ).map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap">
                        {value}
                      </p>
                    </div>
                  ) : null,
                )}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-4" />
                    Edit chart
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-primary/15 px-4 py-10 text-center">
                <FileText className="mb-2 size-8 text-primary/40" />
                <p className="text-sm font-medium text-primary">No assessment yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {canEdit
                    ? "Document the first clinical diagnosis for this visit."
                    : "This visit cannot accept a new chart."}
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            kicker="Nursing"
            title="Nurse notes"
            description="Assessment and vitals from the nursing desk."
            className="xl:col-span-2"
          >
            {current.nurse_notes && current.nurse_notes.length > 0 ? (
              <div className="space-y-3">
                {current.nurse_notes.map((n) => (
                  <QueueItem key={n.id}>
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone="navy">{n.note_type}</StatusPill>
                      {n.created_at ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{n.content}</p>
                  </QueueItem>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-primary/15 px-4 py-10 text-center">
                <FileText className="mb-2 size-8 text-primary/40" />
                <p className="text-sm font-medium text-primary">No nurse notes yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vitals and assessments appear here when nursing documents them.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
