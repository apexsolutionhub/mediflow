"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { BatchSelectionBar } from "@/components/manager/batch-ops";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type EquipmentTicket } from "@/lib/clinic";
import {
  apiErrorDetail,
  formatPoolFailures,
  pruneSelectionToAllowed,
  runWithConcurrency,
} from "@/lib/parallelBatch";
import { cn } from "@/lib/utils";

export default function ManagerRequestsPage() {
  const [tickets, setTickets] = useState<EquipmentTicket[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchClosing, setBatchClosing] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const tix = await api.get("/clinic/tickets/", { params: { page_size: 50 } });
    setTickets(results<EquipmentTicket>(tix.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load requests"));
  }, [load]);

  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === "Open"),
    [tickets],
  );
  const openIds = useMemo(() => openTickets.map((t) => t.id), [openTickets]);
  const openIdSet = useMemo(() => new Set(openIds), [openIds]);
  const selectedOpenIds = useMemo(
    () => pruneSelectionToAllowed(selectedIds, openIdSet),
    [selectedIds, openIdSet],
  );

  const openCount = openTickets.length;

  const closeTickets = async (ids: number[]) => {
    if (ids.length === 0) return;
    const { ok, failed } = await runWithConcurrency(ids, async (id) => {
      try {
        await api.patch(`/clinic/tickets/${id}/`, {
          status: "Closed",
          resolution: "Handled by manager",
        });
        return id;
      } catch (error: unknown) {
        throw new Error(apiErrorDetail(error, `Ticket #${id} failed`));
      }
    });

    if (ok.length > 0) {
      toast.success(
        `Closed ${ok.length} ticket${ok.length === 1 ? "" : "s"}${
          failed.length ? ` (${failed.length} failed)` : ""
        }`,
      );
      setSelectedIds((prev) => prev.filter((id) => !ok.includes(id)));
      await load();
    }
    if (failed.length) {
      toast.error(formatPoolFailures(failed) ?? "Some tickets failed to close");
    }
  };

  return (
    <ClinicShell
      title="Equipment requests"
      subtitle="Repair and purchase escalations from lab / radiology."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total tickets" value={tickets.length} tone="navy" />
        <StatTile label="Open" value={openCount} tone="orange" />
        <StatTile label="Closed" value={tickets.length - openCount} tone="green" />
      </div>

      <SectionCard
        kicker="Maintenance"
        title="Open & closed tickets"
        description="Select open tickets to close many at once, or close one at a time."
        action={
          openCount > 0 ? (
            <StatusPill tone="orange">{openCount} open</StatusPill>
          ) : (
            <StatusPill tone="green">Queue clear</StatusPill>
          )
        }
      >
        {tickets.length === 0 ? (
          <EmptyState
            title="No requests yet"
            hint="Equipment tickets from the lab portal will appear here."
          />
        ) : (
          <div className="space-y-4">
            {openCount > 0 ? (
              <BatchSelectionBar
                actionableIds={openIds}
                selectedIds={selectedOpenIds}
                onSelectedIdsChange={setSelectedIds}
                selectAllLabel="Select all open"
                actionLabel="Close selected"
                actionPending={batchClosing}
                onAction={async () => {
                  setBatchClosing(true);
                  try {
                    await closeTickets(selectedOpenIds);
                  } finally {
                    setBatchClosing(false);
                  }
                }}
              />
            ) : null}

            <ScrollArea className="max-h-[36rem] pr-3">
              <div className="space-y-3">
                {tickets.map((t) => {
                  const isOpen = t.status === "Open";
                  const checked = selectedOpenIds.includes(t.id);
                  return (
                    <QueueItem
                      key={t.id}
                      className={cn(checked && "border-primary/30 bg-primary/4")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {isOpen ? (
                            <Checkbox
                              checked={checked}
                              disabled={batchClosing}
                              onCheckedChange={(value) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(pruneSelectionToAllowed(prev, openIdSet));
                                  if (value === true) next.add(t.id);
                                  else next.delete(t.id);
                                  return [...next];
                                });
                              }}
                              aria-label={`Select ${t.title}`}
                              className="mt-2"
                            />
                          ) : (
                            <span className="mt-2 inline-flex size-4 shrink-0" />
                          )}
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                            <Wrench className="size-4.5" />
                          </span>
                          <div>
                            <p className="font-heading font-semibold text-primary">{t.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {t.details}
                            </p>
                            {t.resolution ? (
                              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="size-3.5" />
                                {t.resolution}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusPill tone={isOpen ? "orange" : "green"}>
                            {t.status}
                          </StatusPill>
                          {isOpen ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={batchClosing || closingId === t.id}
                              onClick={async () => {
                                setClosingId(t.id);
                                try {
                                  await closeTickets([t.id]);
                                } finally {
                                  setClosingId(null);
                                }
                              }}
                            >
                              {closingId === t.id ? "Closing…" : "Close"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
