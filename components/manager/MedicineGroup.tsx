"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Layers } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusPill } from "@/components/ui-chrome";
import type { Medicine } from "@/lib/clinic";
import { cn } from "@/lib/utils";

/**
 * Medicines that share a name are folded into one row: the name plus how many suppliers they come
 * from. It starts collapsed; opening it lists every entry on its own.
 */
export function MedicineGroup({
  name,
  items,
  renderEntry,
}: {
  name: string;
  items: Medicine[];
  renderEntry: (m: Medicine) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const suppliers = new Set(items.map((m) => m.selected_supplier_id ?? m.supplier_name ?? "")).size;
  const low = items.some((m) => m.on_hand <= m.min_threshold);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-primary/10 bg-white/60">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-(--role)/6"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
              <Layers className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-heading font-semibold text-primary">{name}</span>
              <span className="block text-xs text-muted-foreground">
                {items.length} entries · from {suppliers} supplier{suppliers === 1 ? "" : "s"}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {low ? <StatusPill tone="red">Low</StatusPill> : null}
            <StatusPill tone="muted">
              {suppliers} supplier{suppliers === 1 ? "" : "s"}
            </StatusPill>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t border-primary/10 p-3">{items.map((m) => renderEntry(m))}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
