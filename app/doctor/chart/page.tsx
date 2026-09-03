"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Activity,
  ClipboardList,
  FileText,
  HeartPulse,
  Lock,
  NotebookPen,
  Pencil,
  Save,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatusPill,
} from "@/components/ui-chrome";
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

type ChartLike = {
  chief_complaint?: string;
  examination?: string;
  diagnosis?: string;
  clinical_notes?: string;
  treatment_plan?: string;
} | null | undefined;

function chartHasContent(chart: ChartLike) {
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
  if (
    String(order.order_type || "").toLowerCase() === "prescription" &&
    String(order.fulfillment || "") === "external_print"
  ) {
    return false;
  }
  return true;
}

function FieldBlock({
  label,
  value,
  emphasize,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  emphasize?: boolean;
  icon?: typeof FileText;
}) {
  if (!value?.trim()) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5",
        emphasize
          ? "border-cta/25 bg-linear-to-br from-amber-50/90 via-white to-white"
          : "border-primary/10 bg-linear-to-br from-slate-50/80 to-white",
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-lg ring-1",
              emphasize
                ? "bg-cta/15 text-amber-800 ring-cta/25"
                : "bg-primary/8 text-primary ring-primary/15",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <p
          className={cn(
            "text-[11px] font-semibold tracking-[0.14em] uppercase",
            emphasize ? "text-cta" : "text-primary/65",
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-sm leading-6",
          emphasize ? "font-heading text-base font-semibold text-primary" : "text-foreground/90",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-3.5">{children}</div>
    </div>
  );
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

  const statusLabel = isClosed
    ? "History"
    : pendingOrderLock
      ? "Awaiting results"
      : hasResultsBack
        ? "Open after results"
        : hasChart
          ? "Active"
          : "Draft";
  const statusTone = canEdit ? "green" : pendingOrderLock ? "orange" : "muted";

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
            title="Visit assessment"
            description="Document complaint, exam, diagnosis, and plan for this encounter."
            className="xl:col-span-3"
            action={<StatusPill tone={statusTone}>{statusLabel}</StatusPill>}
          >
            <VisitPatientStrip encounter={current} />

            {lockReason ? (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/90 to-white px-3.5 py-3 text-sm text-amber-950/80">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-cta/15 text-amber-800 ring-1 ring-cta/25">
                  <Lock className="size-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-amber-950">Chart locked</p>
                  <p className="mt-0.5 text-xs leading-5 text-amber-900/75">{lockReason}</p>
                </div>
              </div>
            ) : null}

            {showForm ? (
              <form
                className="space-y-4"
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
                <FormSection
                  title="Presentation"
                  description="What brought the patient in and what you found."
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
                </FormSection>

                <FormSection
                  title="Assessment"
                  description="Primary diagnosis is required before saving."
                >
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
                </FormSection>

                <FormSection
                  title="Plan"
                  description="Optional treatment plan — included on the checkout health report."
                >
                  <CustomFormField
                    control={chartForm.control}
                    name="treatment_plan"
                    fieldType={formFieldTypes.TEXTAREA}
                    label="Treatment plan"
                  />
                </FormSection>

                <div className="sticky bottom-3 z-10 rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-lg shadow-primary/10 backdrop-blur-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 px-1">
                      <p className="text-sm font-semibold text-primary">
                        {hasChart ? "Update clinical record" : "Save first assessment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Diagnosis is required. Chart stays editable until checkout.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasChart ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-xl"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      <SubmitButton
                        className={cn(ctaButtonClass, "sm:min-w-44")}
                        loading={saving}
                        loadingLabel="Saving…"
                      >
                        <Save className="size-4" />
                        {hasChart ? "Update chart" : "Save assessment"}
                      </SubmitButton>
                    </div>
                  </div>
                </div>
              </form>
            ) : hasChart ? (
              <div className="space-y-3">
                <FieldBlock
                  label="Diagnosis"
                  value={current.chart?.diagnosis}
                  emphasize
                  icon={Stethoscope}
                />
                <FieldBlock
                  label="Chief complaint"
                  value={current.chart?.chief_complaint}
                  icon={ClipboardList}
                />
                <FieldBlock
                  label="Examination"
                  value={current.chart?.examination}
                  icon={Activity}
                />
                <FieldBlock
                  label="Clinical notes"
                  value={current.chart?.clinical_notes}
                  icon={NotebookPen}
                />
                <FieldBlock
                  label="Treatment plan"
                  value={current.chart?.treatment_plan}
                  icon={FileText}
                />

                {canEdit ? (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl border-primary/15 bg-white shadow-sm"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="size-4" />
                      Edit chart
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No assessment yet"
                hint={
                  canEdit
                    ? "Document the first clinical diagnosis for this visit."
                    : "This visit cannot accept a new chart."
                }
                icon={<FileText className="size-5" />}
              />
            )}
          </SectionCard>

          <SectionCard
            kicker="Nursing"
            title="Nurse notes"
            description="Assessment and vitals from the nursing desk."
            className="xl:col-span-2"
            action={
              current.nurse_notes?.length ? (
                <StatusPill tone="navy">{current.nurse_notes.length}</StatusPill>
              ) : undefined
            }
          >
            {current.nurse_notes && current.nurse_notes.length > 0 ? (
              <div className="space-y-3">
                {current.nurse_notes.map((n) => {
                  const vitals =
                    n.vitals && typeof n.vitals === "object"
                      ? Object.entries(n.vitals).filter(
                          ([, v]) => v != null && String(v).trim() !== "",
                        )
                      : [];
                  return (
                    <QueueItem key={n.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15">
                            <HeartPulse className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <StatusPill tone="navy">{n.note_type}</StatusPill>
                            {n.created_at ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                        {n.content}
                      </p>
                      {vitals.length ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {vitals.map(([key, value]) => (
                            <div
                              key={key}
                              className="rounded-xl border border-primary/10 bg-slate-50/80 px-2.5 py-2"
                            >
                              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                {key.replaceAll("_", " ")}
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-primary">
                                {String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </QueueItem>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No nurse notes yet"
                hint="Vitals and assessments appear here when nursing documents them."
                icon={<HeartPulse className="size-5" />}
              />
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
