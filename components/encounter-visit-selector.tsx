"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
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

/** Inline visit picker for doctor / clinical feature pages. */
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
        mrn: e.patient?.mrn,
      })),
    [encounters],
  );

  const selected = options.find((o) => o.value === String(selectedId));

  if (encounters.length === 0) {
    return (
      <div
        className={cn(
          "mb-5 rounded-3xl border border-dashed border-primary/20 bg-linear-to-br from-slate-50/90 to-white px-5 py-8 text-center",
          className,
        )}
      >
        <span className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
          <Users className="size-5" />
        </span>
        <p className="font-heading text-sm font-semibold text-primary">No visits available</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "clinic-panel mb-5 rounded-3xl border border-primary/10 bg-linear-to-r from-primary/4 via-white to-cta/5 p-4 shadow-sm sm:p-5",
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
        <div className="w-full sm:max-w-md">
          <Select
            value={selectedId ? String(selectedId) : undefined}
            onValueChange={(value) => onSelect(Number(value))}
          >
            <SelectTrigger
              className={cn(
                "h-12 w-full rounded-2xl border-primary/12 bg-white px-3 shadow-sm",
                "hover:border-primary/25 hover:bg-primary/2",
                "data-[state=open]:border-cta/35 data-[state=open]:ring-2 data-[state=open]:ring-cta/15",
              )}
            >
              <SelectValue placeholder="Select encounter">
                {selected ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                      {selected.label
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() || "")
                        .join("") || "?"}
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate font-medium text-primary">
                        {selected.label}
                      </span>
                      <span className="block truncate text-[11px] font-normal text-muted-foreground">
                        {selected.description}
                        {selected.mrn ? ` · ${selected.mrn}` : ""}
                      </span>
                    </span>
                  </span>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              className="w-(--radix-select-trigger-width) min-w-72 rounded-2xl border-primary/10 p-1.5 shadow-xl shadow-primary/10"
            >
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded-xl py-2.5"
                  >
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                        {option.mrn ? ` · ${option.mrn}` : ""}
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
