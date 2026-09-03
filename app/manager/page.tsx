"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  ClipboardList,
  Pill,
  ScanLine,
  Stethoscope,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { ManagerOpsModeOverviewTeaser } from "@/components/manager/ManagerOpsModePortal";
import { SectionCard, StatTile, StatusPill } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { type DashboardStats, money } from "@/lib/clinic";

export default function ManagerOverviewPage() {
  const [stats, setStats] = useState<Partial<DashboardStats>>({});

  const load = useCallback(async () => {
    const { data } = await api.get("/clinic/dashboard/");
    setStats(data);
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load dashboard"));
  }, [load]);

  const alerts = [
    { label: "Pending payments", value: stats.pending_payments, tone: "orange" as const, icon: Wallet },
    { label: "Low stock items", value: stats.low_stock, tone: "rose" as const, icon: AlertTriangle },
    { label: "Open tickets", value: stats.open_tickets, tone: "orange" as const, icon: Wrench },
  ].filter((a) => Number(a.value || 0) > 0);

  return (
    <ClinicShell
      title="Overview"
      subtitle="Clinic health at a glance — queues, payments, stock, and revenue."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Today visits" value={stats.today_encounters ?? "—"} tone="navy" />
        <StatTile label="Open encounters" value={stats.open_encounters ?? "—"} tone="navy" />
        <StatTile label="Pending payments" value={stats.pending_payments ?? "—"} tone="orange" />
        <StatTile
          label="Today revenue"
          value={stats.today_revenue != null ? `${money(stats.today_revenue)} ETB` : "—"}
          tone="green"
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Lab queue" value={stats.lab_queue ?? "—"} tone="navy" />
        <StatTile label="Radiology queue" value={stats.radiology_queue ?? "—"} tone="navy" />
        <StatTile label="Rx queue" value={stats.rx_queue ?? "—"} tone="orange" />
        <StatTile label="Low stock" value={stats.low_stock ?? "—"} tone="rose" />
        <StatTile label="Open tickets" value={stats.open_tickets ?? "—"} tone="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          kicker="Operations"
          title="Clinical queues"
          description="Live workload across desks — each role has its own portal login."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Lab", value: stats.lab_queue, icon: Beaker, tone: "navy" as const },
              { label: "Radiology", value: stats.radiology_queue, icon: ScanLine, tone: "navy" as const },
              { label: "Pharmacy Rx", value: stats.rx_queue, icon: Pill, tone: "orange" as const },
              { label: "Open encounters", value: stats.open_encounters, icon: Stethoscope, tone: "green" as const },
              { label: "Today visits", value: stats.today_encounters, icon: TrendingUp, tone: "navy" as const },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-linear-to-br from-white to-primary/3 px-4 py-3"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-heading text-xl font-semibold text-primary">{item.value ?? "—"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          kicker="Guidance"
          title="Manager playbook"
          description="Quick reminders for running the clinic from this desk."
          action={
            alerts.length > 0 ? (
              <StatusPill tone="orange">{alerts.length} need attention</StatusPill>
            ) : (
              <StatusPill tone="green">All clear</StatusPill>
            )
          }
        >
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={alert.label}
                    className="flex items-center gap-3 rounded-2xl border border-cta/20 bg-amber-50/60 px-4 py-3"
                  >
                    <Icon className="size-4 shrink-0 text-amber-800" />
                    <div>
                      <p className="text-sm font-semibold text-primary">{alert.label}</p>
                      <p className="text-xs text-muted-foreground">{alert.value} waiting</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
                No urgent alerts right now.
              </div>
            )}
            <div className="rounded-2xl border border-primary/10 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
              <p className="flex items-start gap-2">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary/70" />
                Payment approvals stay on reception — never reverse an approval silently.
              </p>
              <p className="mt-2 flex items-start gap-2">
                <Stethoscope className="mt-0.5 size-4 shrink-0 text-primary/70" />
                Use Staff, Billables, Inventory, and Requests in the sidebar. Clinical desks use
                separate role logins.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <ManagerOpsModeOverviewTeaser />
      </div>
    </ClinicShell>
  );
}
