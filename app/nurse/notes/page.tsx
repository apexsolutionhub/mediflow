"use client";

import { useForm } from "react-hook-form";
import { Activity, Save } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Button } from "@/components/ui/button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function NurseNotesPage() {
  const { current, load } = useEncounterBoard("nurse");
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
          title={`Note · ${current.patient.full_name}`}
          description="Vitals and notes sync to the doctor chart in real time."
        >
          <form
            className="grid gap-4"
            onSubmit={noteForm.handleSubmit(async (values) => {
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
            })}
          >
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
            <div className="rounded-2xl border border-primary/10 bg-linear-to-r from-primary/4 to-cta/5 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
            <CustomFormField
              control={noteForm.control}
              name="content"
              fieldType={formFieldTypes.TEXTAREA}
              label="Notes"
            />
            <Button type="submit" className={ctaButtonClass}>
              <Save className="size-4" />
              Save note
            </Button>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
