"use client";

import { ClipboardList } from "lucide-react";

import { ClinicShell } from "@/components/clinic-shell";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function NurseTimelinePage() {
  const { current } = useEncounterBoard("nurse");
  const notes = current?.nurse_notes ?? [];

  return (
    <ClinicShell
      title="Timeline"
      subtitle="Nursing entries for the selected encounter."
    >
      <SelectedVisitBanner encounter={current} boardHref="/nurse" boardLabel="open encounters" />
      {current ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatTile label="Total entries" value={notes.length} tone="navy" />
            <StatTile
              label="With vitals"
              value={notes.filter((n) => n.vitals && Object.keys(n.vitals).length > 0).length}
              tone="green"
            />
            <StatTile label="Encounter" value={current.number} tone="orange" />
          </div>

          <SectionCard
            kicker="History"
            title={`Timeline · ${current.patient.full_name}`}
            description="Chronological nursing documentation for this visit."
            action={notes.length > 0 ? <StatusPill tone="navy">{notes.length} entries</StatusPill> : undefined}
          >
            {notes.length === 0 ? (
              <EmptyState
                title="No nursing entries yet"
                hint="Document vitals and notes from Notes & vitals in the sidebar."
              />
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <QueueItem key={n.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="size-4 text-primary/70" />
                        <StatusPill tone="navy">{n.note_type}</StatusPill>
                      </div>
                      {n.created_at ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6">{n.content}</p>
                    {n.vitals && Object.keys(n.vitals).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(n.vitals).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded-full bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/10"
                          >
                            {k} {String(v)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </QueueItem>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </ClinicShell>
  );
}
