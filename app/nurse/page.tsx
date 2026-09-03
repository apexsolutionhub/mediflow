"use client";

import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";

import { ClinicShell } from "@/components/clinic-shell";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function NurseBoardPage() {
  const router = useRouter();
  const { encounters, selectedId, setSelectedId } = useEncounterBoard("nurse");

  const activeCount = encounters.filter((e) => e.status === "active").length;

  const openNotes = (encounterId: number) => {
    setSelectedId(encounterId);
    router.push("/nurse/notes");
  };

  return (
    <ClinicShell
      title="Open encounters"
      subtitle="Tap a patient card to document notes and vitals for that visit."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Open encounters" value={encounters.length} tone="navy" />
        <StatTile label="Active care" value={activeCount} tone="green" />
        <StatTile
          label="Awaiting notes"
          value={encounters.filter((e) => !(e.nurse_notes && e.nurse_notes.length > 0)).length}
          tone="orange"
        />
      </div>

      <SectionCard
        kicker="Floor"
        title="Open encounters"
        description="Tap a patient to open Notes & vitals for that encounter."
        action={
          encounters.length > 0 ? (
            <StatusPill tone="orange">{encounters.length} on floor</StatusPill>
          ) : undefined
        }
      >
        {encounters.length === 0 ? (
          <EmptyState title="Quiet floor" hint="Open encounters will appear here." />
        ) : (
          <div className="space-y-3">
            {encounters.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotes(item.id)}
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
                          <HeartPulse className="size-4 shrink-0 text-primary/70" />
                          <p className="truncate font-heading text-base font-semibold text-primary">
                            {item.patient.full_name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.number}</p>
                      </div>
                      <StatusPill tone={item.status === "active" ? "green" : "orange"}>
                        {item.status}
                      </StatusPill>
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
