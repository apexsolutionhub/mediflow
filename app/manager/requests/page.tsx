"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
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

export default function ManagerRequestsPage() {
  const [tickets, setTickets] = useState<EquipmentTicket[]>([]);

  const load = useCallback(async () => {
    const tix = await api.get("/clinic/tickets/", { params: { page_size: 50 } });
    setTickets(results<EquipmentTicket>(tix.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load requests"));
  }, [load]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "Open").length,
    [tickets],
  );

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
        description="Lab and radiology escalate equipment needs here."
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
          <ScrollArea className="max-h-[36rem] pr-3">
            <div className="space-y-3">
              {tickets.map((t) => (
                <QueueItem key={t.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Wrench className="size-4.5" />
                      </span>
                      <div>
                        <p className="font-heading font-semibold text-primary">{t.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.details}</p>
                        {t.resolution ? (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="size-3.5" />
                            {t.resolution}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill tone={t.status === "Open" ? "orange" : "green"}>
                        {t.status}
                      </StatusPill>
                      {t.status === "Open" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={async () => {
                            await api.patch(`/clinic/tickets/${t.id}/`, {
                              status: "Closed",
                              resolution: "Handled by manager",
                            });
                            toast.success("Ticket closed");
                            await load();
                          }}
                        >
                          Close
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </QueueItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
