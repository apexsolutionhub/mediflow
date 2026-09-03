"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type FollowUpFormValues = {
  scheduled_at: Date | null;
  reason: string;
};

export default function DoctorFollowUpPage() {
  const { encounters, current, selectedId, setSelectedId } = useEncounterBoard("doctor");
  const [scheduling, setScheduling] = useState(false);
  const apptForm = useForm<FollowUpFormValues>({
    defaultValues: { scheduled_at: null, reason: "Follow-up" },
  });

  return (
    <ClinicShell
      title="Follow-up"
      subtitle="Schedule the next visit for the selected patient."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <SectionCard
          className="mx-auto max-w-xl"
          kicker="Scheduling"
          title="Follow-up appointment"
          description="Book the next visit. Reception will see it on today's appointments list."
        >
          <VisitPatientStrip encounter={current} />
          <form
            className="space-y-4"
            onSubmit={apptForm.handleSubmit(async (values) => {
              if (!values.scheduled_at) {
                toast.error("Pick a date and time");
                return;
              }
              setScheduling(true);
              try {
                await api.post("/clinic/appointments/", {
                  patient: current.patient.id,
                  scheduled_at: values.scheduled_at.toISOString(),
                  reason: values.reason,
                });
                toast.success("Appointment scheduled");
                apptForm.reset({ scheduled_at: null, reason: "Follow-up" });
              } catch {
                toast.error("Could not schedule appointment");
              } finally {
                setScheduling(false);
              }
            })}
          >
            <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
                Appointment
              </p>
              <CustomFormField
                control={apptForm.control}
                name="scheduled_at"
                fieldType={formFieldTypes.DATETIME}
                label="When"
                placeholder="Pick date and time"
                className="h-11 w-full justify-between rounded-xl px-3.5 font-normal"
              />
              <CustomFormField
                control={apptForm.control}
                name="reason"
                fieldType={formFieldTypes.INPUT}
                label="Reason"
              />
            </div>

            <div className="rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-sm">
              <SubmitButton
                className={cn("h-11 w-full rounded-xl", ctaButtonClass)}
                loading={scheduling}
                loadingLabel="Scheduling…"
              >
                <CalendarDays className="size-4" />
                Schedule follow-up
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
