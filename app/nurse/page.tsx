"use client";

import Link from "next/link";
import { ClipboardList, FileText, HeartPulse } from "lucide-react";

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

export default function NurseBoardPage() {
  const { encounters, selectedId, setSelectedId } = useEncounterBoard("nurse");

  const activeCount = encounters.filter((e) => e.status === "active").length;

  return (
    <ClinicShell
      title="Open encounters"
      subtitle="Select a patient, then open Notes & vitals or Timeline from the sidebar."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Open encounters" value={encounters.length} tone="navy" />
        <StatTile label="Active care" value={activeCount} tone="green" />
        <StatTile label="Selected" value={selectedId ? 1 : 0} tone="orange" />
      </div>

      {selectedId ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/nurse/notes" onClick={() => setSelectedEncounterId(selectedId)}>
              <FileText className="size-4" />
              Notes & vitals
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/nurse/timeline">
              <ClipboardList className="size-4" />
              Timeline
            </Link>
          </Button>
        </div>
      ) : null}

      <SectionCard
        kicker="Floor"
        title="Open encounters"
        description="Tap a patient to document vitals and nursing notes."
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
