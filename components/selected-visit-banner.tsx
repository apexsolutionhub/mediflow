"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

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
      <div className="clinic-panel clinic-panel-glow mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/10 bg-linear-to-r from-primary/4 via-white to-cta/5 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
              Working visit
            </p>
            <p className="mt-1 truncate font-heading text-base font-semibold text-primary">
              {encounter.patient.full_name} · {encounter.number}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl border-primary/15">
          <Link href={boardHref}>Change on {boardLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="clinic-panel mb-5 rounded-3xl border border-dashed border-primary/20 bg-linear-to-br from-slate-50/90 to-white px-5 py-8 text-center">
      <span className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
        <UserRound className="size-5" />
      </span>
      <p className="font-heading font-semibold text-primary">No visit selected</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a patient on the {boardLabel} first.
      </p>
      <Button asChild className="mt-4 rounded-xl" size="sm">
        <Link href={boardHref}>Open {boardLabel}</Link>
      </Button>
    </div>
  );
}
