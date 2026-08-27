"use client";

import Link from "next/link";
import { CalendarDays, FileText, Stethoscope, Users } from "lucide-react";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { setSelectedEncounterId } from "@/lib/clinic-selection";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function DoctorVisitsPage() {
  const { encounters, selectedId, setSelectedId } = useEncounterBoard("doctor");

  const activeCount = encounters.filter((e) => e.status === "active").length;

  return (
    <ClinicShell
      title="Active visits"
      subtitle="Paid visits only. Select a patient, then use Chart, Orders, Follow-up, or Referrals in the sidebar."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Payment-approved" value={encounters.length} tone="navy" />
        <StatTile label="In consultation" value={activeCount} tone="green" />
        <StatTile label="Selected" value={selectedId ? 1 : 0} tone="orange" />
      </div>

      {selectedId ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/doctor/chart" onClick={() => setSelectedEncounterId(selectedId)}>
              <FileText className="size-4" />
              Open chart
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/doctor/orders">Orders</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/doctor/follow-up">
              <CalendarDays className="size-4" />
              Follow-up
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/doctor/referrals">
              <Users className="size-4" />
              Referrals
            </Link>
          </Button>
        </div>
      ) : null}

      <SectionCard
        kicker="Consultation"
        title="Active visits"
        description="Reception must approve consultation payment before patients appear here."
        action={
          encounters.length > 0 ? (
            <StatusPill tone="green">{encounters.length} ready</StatusPill>
          ) : undefined
        }
      >
        {encounters.length === 0 ? (
          <EmptyState
            title="No active visits"
            hint="Reception must approve consultation payment before patients appear here."
          />
        ) : (
          <div className="space-y-3">
            {encounters.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="w-full text-left"
                >
                  <QueueItem
                    className={
                      active
                        ? "border-cta/35 bg-cta/5 shadow-md shadow-cta/10"
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="size-4 shrink-0 text-primary/70" />
                          <p className="truncate font-heading text-base font-semibold text-primary">
                            {item.patient.full_name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.number} · {item.arrival_type}
                        </p>
                      </div>
                      <StatusPill tone="green">{item.status}</StatusPill>
                    </div>
                  </QueueItem>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
