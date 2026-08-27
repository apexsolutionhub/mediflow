"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Encounter } from "@/lib/clinic";

/** Banner when a feature page needs a visit picked from the role board. */
export function SelectedVisitBanner({
  encounter,
  boardHref,
  boardLabel = "board",
}: {
  encounter: Encounter | null;
  boardHref: string;
  boardLabel?: string;
}) {
  if (encounter) {
    return (
      <div className="clinic-panel clinic-panel-glow mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4">
        <div>
          <p className="clinic-kicker">Working visit</p>
          <p className="mt-1 font-heading text-base font-semibold text-primary">
            {encounter.patient.full_name} · {encounter.number}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl border-primary/15">
          <Link href={boardHref}>Change on {boardLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="clinic-panel mb-5 rounded-3xl border border-dashed border-primary/20 px-5 py-8 text-center">
      <p className="font-heading font-semibold text-primary">No visit selected</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a patient on the {boardLabel} first.
      </p>
      <Button asChild className="mt-4" size="sm">
        <Link href={boardHref}>Open {boardLabel}</Link>
      </Button>
    </div>
  );
}
