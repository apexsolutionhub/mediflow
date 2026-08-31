"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, QueueItem, SectionCard, StatusPill } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function DoctorChartPage() {
  const { current, load } = useEncounterBoard("doctor");
  const [saving, setSaving] = useState(false);
  const chartForm = useForm({
    defaultValues: {
      chief_complaint: "",
      examination: "",
      diagnosis: "",
      clinical_notes: "",
      treatment_plan: "",
    },
  });

  useEffect(() => {
    if (!current) return;
    chartForm.reset({
      chief_complaint: current.chart?.chief_complaint || "",
      examination: current.chart?.examination || "",
      diagnosis: current.chart?.diagnosis || "",
      clinical_notes: current.chart?.clinical_notes || "",
      treatment_plan: current.chart?.treatment_plan || "",
    });
  }, [current, chartForm]);

  return (
    <ClinicShell
      title="Chart"
      subtitle="Document complaint, exam, diagnosis, and plan for the selected visit."
    >
      <SelectedVisitBanner encounter={current} boardHref="/doctor" boardLabel="active visits" />
      {current ? (
        <div className="grid gap-6 xl:grid-cols-5">
          <SectionCard
            kicker="Clinical record"
            title={`Chart · ${current.patient.full_name}`}
            description={`${current.patient.mrn}${current.patient.allergies ? ` · Allergies: ${current.patient.allergies}` : ""}`}
            className="xl:col-span-3"
          >
            <form
              className="grid gap-4"
              onSubmit={chartForm.handleSubmit(async (values) => {
                if (!current) return;
                setSaving(true);
                try {
                  await api.post("/clinic/charts/", { encounter: current.id, ...values });
                  toast.success("Chart saved");
                  await load();
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
              <SubmitButton className={ctaButtonClass} loading={saving} loadingLabel="Saving…">
                <Save className="size-4" />
                Save chart
              </SubmitButton>
            </form>
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
