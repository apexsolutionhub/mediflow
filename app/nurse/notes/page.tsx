"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Activity, NotebookPen, Save } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

export default function NurseNotesPage() {
  const { current, load } = useEncounterBoard("nurse");
  const [saving, setSaving] = useState(false);
  const noteForm = useForm({
    defaultValues: {
      note_type: "assessment",
      content: "",
      bp: "",
      pulse: "",
      temp: "",
      spo2: "",
    },
  });

  return (
    <ClinicShell
      title="Notes & vitals"
      subtitle="Assessment, triage, vitals, and medication notes — visible on the doctor chart."
    >
      <SelectedVisitBanner encounter={current} boardHref="/nurse" boardLabel="open encounters" />
      {current ? (
        <SectionCard
          className="mx-auto max-w-2xl"
          kicker="Documentation"
          title="Nursing note"
          description="Vitals and notes sync to the doctor chart for this visit."
        >
          <VisitPatientStrip encounter={current} />
          <form
            className="space-y-4"
            onSubmit={noteForm.handleSubmit(async (values) => {
              setSaving(true);
              try {
                const vitals: Record<string, string> = {};
                if (values.bp) vitals.bp = values.bp;
                if (values.pulse) vitals.pulse = values.pulse;
                if (values.temp) vitals.temp = values.temp;
                if (values.spo2) vitals.spo2 = values.spo2;
                await api.post("/clinic/nurse-notes/", {
                  encounter: current.id,
                  note_type: values.note_type,
                  content: values.content,
                  vitals,
                });
                toast.success("Nursing note saved");
                noteForm.reset({
                  note_type: values.note_type,
                  content: "",
                  bp: "",
                  pulse: "",
                  temp: "",
                  spo2: "",
                });
                await load();
              } finally {
                setSaving(false);
              }
            })}
          >
            <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15">
                  <NotebookPen className="size-3.5" />
                </span>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
                  Note
                </p>
              </div>
              <CustomFormField
                control={noteForm.control}
                name="note_type"
                fieldType={formFieldTypes.SELECT}
                label="Type"
                options={[
                  { label: "Assessment", value: "assessment" },
                  { label: "Monitoring", value: "monitoring" },
                  { label: "Triage", value: "triage" },
                  { label: "Med administration", value: "med_admin" },
                  { label: "General note", value: "note" },
                ]}
              />
              <CustomFormField
                control={noteForm.control}
                name="content"
                fieldType={formFieldTypes.TEXTAREA}
                label="Notes"
              />
            </div>

            <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-cta/5 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
                <Activity className="size-3.5" />
                Vitals
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CustomFormField
                  control={noteForm.control}
                  name="bp"
                  fieldType={formFieldTypes.INPUT}
                  label="BP"
                  placeholder="120/80"
                />
                <CustomFormField
                  control={noteForm.control}
                  name="pulse"
                  fieldType={formFieldTypes.INPUT}
                  label="Pulse"
                />
                <CustomFormField
                  control={noteForm.control}
                  name="temp"
                  fieldType={formFieldTypes.INPUT}
                  label="Temp °C"
                />
                <CustomFormField
                  control={noteForm.control}
                  name="spo2"
                  fieldType={formFieldTypes.INPUT}
                  label="SpO₂ %"
                />
              </div>
            </div>

            <div className="sticky bottom-3 z-10 rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-lg shadow-primary/10 backdrop-blur-sm">
              <SubmitButton
                className={cn("h-11 w-full rounded-xl", ctaButtonClass)}
                loading={saving}
                loadingLabel="Saving…"
              >
                <Save className="size-4" />
                Save note
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
