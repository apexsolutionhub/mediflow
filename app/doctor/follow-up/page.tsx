"use client";

import { useForm } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type FollowUpFormValues = {
  scheduled_at: Date | null;
  reason: string;
};

export default function DoctorFollowUpPage() {
  const { current } = useEncounterBoard("doctor");
  const apptForm = useForm<FollowUpFormValues>({
    defaultValues: { scheduled_at: null, reason: "Follow-up" },
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
            onSubmit={apptForm.handleSubmit(async (values) => {
              if (!values.scheduled_at) {
                toast.error("Pick a date and time");
                return;
              }
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
              }
            })}
          >
            <FieldGroup>
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
              <Separator className="bg-primary/8" />
              <Button type="submit" className={cn("h-11 rounded-xl", ctaButtonClass)}>
                <CalendarDays className="size-4" />
                Schedule follow-up
              </Button>
            </FieldGroup>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
