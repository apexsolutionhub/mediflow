"use client";

import { useForm } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Button } from "@/components/ui/button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function DoctorFollowUpPage() {
  const { current } = useEncounterBoard("doctor");
  const apptForm = useForm({
    defaultValues: { scheduled_at: "", reason: "Follow-up" },
  });

  return (
    <ClinicShell
      title="Follow-up"
      subtitle="Schedule the next visit for the selected patient."
    >
      <SelectedVisitBanner encounter={current} boardHref="/doctor" boardLabel="active visits" />
      {current ? (
        <SectionCard
          className="mx-auto max-w-lg"
          kicker="Scheduling"
          title="Follow-up appointment"
          description={`Book the next visit for ${current.patient.full_name}. Reception will see it on today's appointments.`}
        >
          <form
            className="grid gap-4"
            onSubmit={apptForm.handleSubmit(async (values) => {
              await api.post("/clinic/appointments/", {
                patient: current.patient.id,
                scheduled_at: values.scheduled_at,
                reason: values.reason,
              });
              toast.success("Appointment scheduled");
              apptForm.reset({ scheduled_at: "", reason: "Follow-up" });
            })}
          >
            <CustomFormField
              control={apptForm.control}
              name="scheduled_at"
              fieldType={formFieldTypes.INPUT}
              type="datetime-local"
              label="When"
            />
            <CustomFormField
              control={apptForm.control}
              name="reason"
              fieldType={formFieldTypes.INPUT}
              label="Reason"
            />
            <Button type="submit" className={ctaButtonClass}>
              <CalendarDays className="size-4" />
              Schedule follow-up
            </Button>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
