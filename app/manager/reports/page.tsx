"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Beaker,
  Pill,
  ScanLine,
  Share2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { SectionCard, StatTile } from "@/components/ui-chrome";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  money,
  type ManagerReport,
  type ManagerReportPeriod,
} from "@/lib/clinic";
import { cn } from "@/lib/utils";

const PERIODS: { key: ManagerReportPeriod; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "half_year", label: "Half-year" },
  { key: "year", label: "Yearly" },
];

export default function ManagerReportsPage() {
  const [period, setPeriod] = useState<ManagerReportPeriod>("day");
  const [report, setReport] = useState<ManagerReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next: ManagerReportPeriod) => {
    setLoading(true);
    try {
      const { data } = await api.get<ManagerReport>("/clinic/reports/", {
        params: { period: next },
      });
      setReport(data);
    } catch {
      setReport(null);
      toast.error("Could not load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  return (
    <ClinicShell
      title="Reports"
      subtitle="Branch performance for the selected period — visits, revenue, and clinical volume."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <Button
            key={item.key}
            type="button"
            variant={period === item.key ? "default" : "outline"}
            className={cn("rounded-xl", period === item.key && "shadow-sm")}
            disabled={loading}
            onClick={() => setPeriod(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {report ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {report.period_label} · {report.start_date} → {report.end_date}
            {report.branch_name ? ` · ${report.branch_name}` : ""}
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Visits" value={report.visits} tone="navy" />
            <StatTile label="New patients" value={report.new_patients} tone="navy" />
            <StatTile
              label="Revenue"
              value={`${money(report.revenue)} ETB`}
              tone="green"
            />
            <StatTile label="Payments" value={report.payment_count} tone="orange" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              kicker="Clinical volume"
              title="Orders in period"
              description="Lab, radiology, prescriptions, and referrals created in this window."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Lab orders", value: report.lab_orders, icon: Beaker },
                  {
                    label: "Radiology orders",
                    value: report.radiology_orders,
                    icon: ScanLine,
                  },
                  {
                    label: "Prescriptions",
                    value: report.prescriptions,
                    icon: Pill,
                  },
                  { label: "Referrals", value: report.referrals, icon: Share2 },
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
                        <p className="font-heading text-xl font-semibold text-primary">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              kicker="Snapshot"
              title="Branch status"
              description="Closed visits in-period plus live stock and ticket counts."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Closed encounters",
                    value: report.closed_encounters,
                    icon: Users,
                  },
                  {
                    label: "New patients",
                    value: report.new_patients,
                    icon: UserPlus,
                  },
                  {
                    label: "Low stock (now)",
                    value: report.low_stock,
                    icon: TrendingUp,
                  },
                  {
                    label: "Open tickets (now)",
                    value: report.open_tickets,
                    icon: Wallet,
                  },
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
                        <p className="font-heading text-xl font-semibold text-primary">
                          {loading ? "—" : item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
          {loading ? "Loading report…" : "No report data yet."}
        </div>
      )}
    </ClinicShell>
  );
}
