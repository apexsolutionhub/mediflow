"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type Appointment } from "@/lib/clinic";

export default function ReceptionAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const load = useCallback(async () => {
    const appts = await api.get("/clinic/appointments/", {
      params: { today: 1, page_size: 50 },
    });
    setAppointments(results<Appointment>(appts.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load appointments"));
  }, [load]);

  const upcoming = appointments.filter(
    (a) => new Date(a.scheduled_at).getTime() >= Date.now(),
  ).length;

  return (
    <ClinicShell
      title="Appointments"
      subtitle="Today's scheduled visits and follow-up reminders."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Today scheduled" value={appointments.length} tone="navy" />
        <StatTile label="Still upcoming" value={upcoming} tone="orange" />
        <StatTile label="Completed / past" value={appointments.length - upcoming} tone="green" />
      </div>

      <SectionCard
        kicker="Schedule"
        title="Appointment reminders"
        description="Doctors schedule follow-ups from the doctor portal."
        action={
          appointments.length > 0 ? (
            <StatusPill tone="navy">{appointments.length} today</StatusPill>
          ) : undefined
        }
      >
        {appointments.length === 0 ? (
          <EmptyState
            title="No appointments today"
            hint="Doctors schedule follow-ups from the doctor portal."
            icon={<CalendarDays className="size-5" />}
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <QueueItem key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                      <CalendarDays className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-heading font-semibold text-primary">
                        {a.patient_name || `Patient #${a.patient}`}
                      </p>
                      {a.reason ? (
                        <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Clock className="size-4 text-cta" />
                    {new Date(a.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </QueueItem>
            ))}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
