"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type Appointment, type Encounter, money } from "@/lib/clinic";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function ReceptionBoardPage() {
  const router = useRouter();
  const { encounters, selectedId, setSelectedId } = useEncounterBoard("today");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/clinic/appointments/", { params: { today: 1, page_size: 50 } })
      .then(({ data }) => {
        if (!cancelled) setAppointments(results<Appointment>(data));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load appointments", { id: "reception-appts" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCashier = (item: Encounter) => {
    setSelectedId(item.id);
    const due = Number(item.amount_due || 0);
    if (due <= 0) {
      toast.message("No payment due", {
        description: "This visit has nothing awaiting cashier approval.",
      });
      return;
    }
    router.push("/reception/cashier");
  };

  return (
    <ClinicShell
      title="Today board"
      subtitle="Tap a patient with amount due to open cashier. Paid-up visits stay on the board without redirecting."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Today on board" value={encounters.length} tone="navy" />
        <StatTile
          label="Awaiting payment"
          value={encounters.filter((e) => Number(e.amount_due || 0) > 0).length}
          tone="orange"
        />
        <StatTile label="Today&apos;s appointments" value={appointments.length} tone="green" />
      </div>

      <SectionCard
        kicker="Front desk"
        title="Today&apos;s patient board"
        description="Tap a visit with payment due to open cashier. Visits with nothing due are selected only."
      >
        {encounters.length === 0 ? (
          <EmptyState
            title="No arrivals yet"
            hint="Use Register in the sidebar to open an encounter."
            icon={<UserPlus className="size-5" />}
          />
        ) : (
          <div className="space-y-3">
            {encounters.map((item: Encounter) => {
              const due = Number(item.amount_due || 0);
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openCashier(item)}
                  className="w-full text-left"
                >
                  <QueueItem
                    className={
                      active
                        ? "border-cta/35 bg-cta/5 shadow-md shadow-cta/10"
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                          {(item.patient?.full_name || "?")
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase() || "")
                            .join("") || "?"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-heading text-base font-semibold text-primary">
                            {item.patient?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.number} · {item.arrival_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusPill
                          tone={
                            item.status === "closed"
                              ? "muted"
                              : item.status === "active"
                                ? "green"
                                : "orange"
                          }
                        >
                          {item.status}
                        </StatusPill>
                        {due > 0 ? (
                          <span className="text-xs font-semibold text-cta">
                            {money(due)} ETB due
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700">Paid up</span>
                        )}
                      </div>
                    </div>
                  </QueueItem>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
