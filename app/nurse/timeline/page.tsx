"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Filter } from "lucide-react";

import { ClinicShell } from "@/components/clinic-shell";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, results } from "@/lib/api";
import { type Encounter } from "@/lib/clinic";
import { cn } from "@/lib/utils";

type TimelineEntry = {
  id: number;
  note_type: string;
  content: string;
  vitals?: Record<string, unknown>;
  created_at?: string;
  encounterId: number;
  encounterNumber: string;
  patientName: string;
  patientId: number;
};

const ALL_FILTER = "all";

export default function NurseTimelinePage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(ALL_FILTER);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/clinic/encounters/", { params: { page_size: 100 } })
      .then(({ data }) => {
        if (!cancelled) setEncounters(results<Encounter>(data));
      })
      .catch(() => {
        if (!cancelled) setEncounters([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => {
    const rows: TimelineEntry[] = [];
    for (const encounter of encounters) {
      const notes = encounter.nurse_notes ?? [];
      for (const note of notes) {
        rows.push({
          id: note.id,
          note_type: note.note_type,
          content: note.content,
          vitals: note.vitals,
          created_at: note.created_at,
          encounterId: encounter.id,
          encounterNumber: encounter.number,
          patientName: encounter.patient?.full_name || "Patient",
          patientId: encounter.patient?.id || 0,
        });
      }
    }
    return rows.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [encounters]);

  const filterOptions = useMemo(() => {
    const byEncounter = new Map<
      number,
      { value: string; label: string; description: string }
    >();
    for (const entry of entries) {
      if (byEncounter.has(entry.encounterId)) continue;
      byEncounter.set(entry.encounterId, {
        value: String(entry.encounterId),
        label: entry.patientName,
        description: entry.encounterNumber,
      });
    }
    return Array.from(byEncounter.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === ALL_FILTER) return entries;
    return entries.filter((entry) => String(entry.encounterId) === filter);
  }, [entries, filter]);

  const withVitals = filteredEntries.filter(
    (n) => n.vitals && Object.keys(n.vitals).length > 0,
  ).length;

  const selectedLabel =
    filter === ALL_FILTER
      ? "All history"
      : filterOptions.find((o) => o.value === filter)?.label || "Selected visit";

  return (
    <ClinicShell
      title="Timeline"
      subtitle="Your nursing history across visits — filter by patient when you need a single encounter."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Entries shown" value={filteredEntries.length} tone="navy" />
        <StatTile label="With vitals" value={withVitals} tone="green" />
        <StatTile label="Filter" value={selectedLabel} tone="orange" />
      </div>

      <SectionCard
        kicker="History"
        title="Nursing timeline"
        description="Default view shows all of your documented entries. Narrow by encounter when reviewing one patient."
        action={
          filteredEntries.length > 0 ? (
            <StatusPill tone="navy">{filteredEntries.length} entries</StatusPill>
          ) : undefined
        }
      >
        <div
          className={cn(
            "mb-5 rounded-2xl border border-primary/12 bg-linear-to-r from-primary/5 via-white to-cta/5 p-4",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
                <Filter className="size-3.5" />
                Filter timeline
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a visit to focus, or keep All for the full history.
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-11 w-full rounded-xl border-primary/15 bg-white shadow-sm">
                  <SelectValue placeholder="All history" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_FILTER}>
                      <span className="flex flex-col items-start gap-0.5">
                        <span>All</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Full nursing history
                        </span>
                      </span>
                    </SelectItem>
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex flex-col items-start gap-0.5">
                          <span>{option.label}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <EmptyState title="Loading timeline…" hint="Gathering nursing entries." />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title={filter === ALL_FILTER ? "No nursing history yet" : "No entries for this visit"}
            hint="Document vitals and notes from Notes & vitals, then return here."
          />
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((n) => (
              <QueueItem key={`${n.encounterId}-${n.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ClipboardList className="size-4 shrink-0 text-primary/70" />
                      <StatusPill tone="navy">{n.note_type}</StatusPill>
                      {filter === ALL_FILTER ? (
                        <span className="truncate text-xs font-medium text-primary">
                          {n.patientName}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {n.encounterNumber}
                          </span>
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
                  </div>
                  {n.created_at ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </QueueItem>
            ))}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
