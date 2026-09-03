"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Encounter } from "@/lib/clinic";
import { cn } from "@/lib/utils";

/** Inline visit picker for doctor feature pages (replaces Active visits board). */
export function EncounterVisitSelector({
  encounters,
  selectedId,
  onSelect,
  className,
  emptyHint = "No payment-approved visits yet. Reception must unlock consultation first.",
}: {
  encounters: Encounter[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  className?: string;
  emptyHint?: string;
}) {
  const options = useMemo(
    () =>
      encounters.map((e) => ({
        value: String(e.id),
        label: e.patient?.full_name || "Patient",
        description: `${e.number} · ${e.status}`,
      })),
    [encounters],
  );

  if (encounters.length === 0) {
    return (
      <div
        className={cn(
          "mb-5 rounded-2xl border border-dashed border-primary/20 bg-slate-50/80 px-4 py-5 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyHint}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-5 rounded-2xl border border-primary/12 bg-linear-to-r from-primary/5 via-white to-cta/5 p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
            Working visit
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the patient / encounter for this task.
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <Select
            value={selectedId ? String(selectedId) : undefined}
            onValueChange={(value) => onSelect(Number(value))}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-primary/15 bg-white shadow-sm">
              <SelectValue placeholder="Select encounter" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
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
  );
}
