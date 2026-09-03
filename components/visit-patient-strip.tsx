"use client";

import { AlertTriangle, UserRound } from "lucide-react";
import type { Encounter } from "@/lib/clinic";
import { cn } from "@/lib/utils";

/** Compact patient context strip used across clinic feature pages. */
export function VisitPatientStrip({
  encounter,
  className,
}: {
  encounter: Encounter;
  className?: string;
}) {
  const patient = encounter.patient;
  return (
    <div
      className={cn(
        "mb-5 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/4 via-white to-cta/5 px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15">
            <UserRound className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold tracking-tight text-primary">
              {patient?.full_name || "Patient"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {patient?.mrn || "—"}
              {encounter.number ? ` · ${encounter.number}` : ""}
              {patient?.age != null ? ` · Age ${patient.age}` : ""}
              {patient?.gender ? ` · ${patient.gender}` : ""}
            </p>
          </div>
        </div>
        {patient?.allergies ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
            <AlertTriangle className="size-3" />
            Allergies: {patient.allergies}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            No known allergies
          </span>
        )}
      </div>
    </div>
  );
}
