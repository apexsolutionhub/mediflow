"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
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
          "mb-5 rounded-2xl border border-dashed border-(--role)/35 bg-linear-to-b from-white to-(--role)/5 px-5 py-8 text-center",
          className,
        )}
      >
        <span className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
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
        "clinic-panel clinic-band mb-5 rounded-2xl p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="clinic-kicker">
            Working visit
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the patient / encounter for this task.
          </p>
        </div>
        <div className="w-full lg:max-w-md">
          <Combobox
            value={selectedId ? String(selectedId) : undefined}
            onValueChange={(value) => onSelect(Number(value))}
            align="end"
            placeholder="Select encounter"
            searchPlaceholder="Search patient or MRN…"
            className="h-12 rounded-2xl px-3"
            contentClassName="min-w-72"
            renderValue={(sel) =>
              selected ? (
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-[11px] font-bold text-white shadow-sm shadow-(--role)/25">
                    {selected.label
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() || "")
                      .join("") || "?"}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate font-medium text-primary">{selected.label}</span>
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">
                      {selected.description}
                      {selected.mrn ? ` · ${selected.mrn}` : ""}
                    </span>
                  </span>
                </span>
              ) : (
                (sel?.label ?? "Select encounter")
              )
            }
            options={options.map((option) => ({
              value: option.value,
              label: option.label,
              keywords: `${option.description ?? ""} ${option.mrn ?? ""}`,
              content: (
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {option.description}
                    {option.mrn ? ` · ${option.mrn}` : ""}
                  </span>
                </span>
              ),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
