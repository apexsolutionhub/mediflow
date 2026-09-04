"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Beaker, ScanLine, Send, Wrench } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SubmitButton } from "@/components/ui/submit-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type EquipmentTicket } from "@/lib/clinic";

type UnitKind = "lab" | "radiology";

const META: Record<
  UnitKind,
  { kicker: string; toastId: string; icon: typeof Beaker }
> = {
  lab: { kicker: "Lab ops", toastId: "lab-eq", icon: Beaker },
  radiology: { kicker: "Radiology ops", toastId: "rad-eq", icon: ScanLine },
};

export function EquipmentRequestPortal({ kind }: { kind: UnitKind }) {
  const meta = META[kind];
  const [tickets, setTickets] = useState<EquipmentTicket[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const ticketForm = useForm({
    defaultValues: { title: "", details: "" },
  });

  const load = useCallback(async () => {
    const ticketRes = await api.get("/clinic/tickets/", { params: { page_size: 50 } });
    setTickets(results<EquipmentTicket>(ticketRes.data));
  }, []);

  useEffect(() => {
    load().catch(() =>
      toast.error("Could not load equipment requests", { id: meta.toastId }),
    );
  }, [load, meta.toastId]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "Open").length,
    [tickets],
  );

  return (
    <ClinicShell
      title="Equipment"
      subtitle="Request repair or purchase — routed to the manager."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="My requests" value={tickets.length} tone="navy" />
        <StatTile label="Open" value={openCount} tone="orange" />
        <StatTile label="Resolved" value={tickets.length - openCount} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          kicker={meta.kicker}
          title="Equipment request"
          description="Escalate repair or purchase needs to clinic management."
        >
          <form
            className="grid gap-4"
            onSubmit={ticketForm.handleSubmit(async (values) => {
              setSubmitting(true);
              try {
                await api.post("/clinic/tickets/", values);
                toast.success("Request sent to manager");
                ticketForm.reset();
                await load();
              } finally {
                setSubmitting(false);
              }
            })}
          >
            <CustomFormField
              control={ticketForm.control}
              name="title"
              fieldType={formFieldTypes.INPUT}
              label="Title"
              placeholder="Repair / purchase"
            />
            <CustomFormField
              control={ticketForm.control}
              name="details"
              fieldType={formFieldTypes.TEXTAREA}
              label="Details"
            />
            <SubmitButton className={ctaButtonClass} loading={submitting} loadingLabel="Submitting…">
              <Send className="size-4" />
              Submit to manager
            </SubmitButton>
          </form>
        </SectionCard>

        <SectionCard
          kicker="History"
          title="Your tickets"
          description="Track manager responses on equipment escalations."
          action={
            openCount > 0 ? (
              <StatusPill tone="orange">{openCount} open</StatusPill>
            ) : (
              <StatusPill tone="green">All clear</StatusPill>
            )
          }
        >
          {tickets.length === 0 ? (
            <EmptyState
              title="No requests yet"
              hint="Submit a repair or purchase ticket when equipment needs attention."
              icon={<Wrench className="size-5" />}
            />
          ) : (
            <ScrollArea className="max-h-96 pr-3">
              <div className="space-y-3">
                {tickets.map((t) => (
                  <QueueItem key={t.id}>
                    <div className="flex justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Wrench className="mt-0.5 size-4 shrink-0 text-primary/70" />
                        <span className="font-heading font-semibold text-primary">{t.title}</span>
                      </div>
                      <StatusPill tone={t.status === "Open" ? "orange" : "green"}>
                        {t.status}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.details}</p>
                  </QueueItem>
                ))}
              </div>
            </ScrollArea>
          )}
        </SectionCard>
      </div>
    </ClinicShell>
  );
}
