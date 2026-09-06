"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beaker,
  CalendarRange,
  Pill,
  ScanLine,
  Share2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { SectionCard, StatTile } from "@/components/ui-chrome";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  money,
  type ManagerReport,
  type ManagerReportPeriod,
} from "@/lib/clinic";

const PERIODS: { key: ManagerReportPeriod; label: string; hint: string }[] = [
  { key: "day", label: "Daily", hint: "Today so far" },
  { key: "month", label: "Monthly", hint: "From the 1st of this month" },
  { key: "quarter", label: "Quarterly", hint: "Current calendar quarter" },
  { key: "half_year", label: "Half-year", hint: "Current 6-month half" },
  { key: "year", label: "Yearly", hint: "Calendar year to date" },
];

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManagerReportsPage() {
  const [period, setPeriod] = useState<ManagerReportPeriod>("month");
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

  const summary = report?.summary;
  const selectedPeriod = useMemo(
    () => PERIODS.find((p) => p.key === period) || PERIODS[0],
    [period],
  );

  return (
    <ClinicShell
      title="Reports"
      subtitle="Detailed branch analytics for the selected period — not the live overview board."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Reporting window
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report
              ? `${report.period_label} · ${report.start_date} → ${report.end_date}${
                  report.branch_name ? ` · ${report.branch_name}` : ""
                }`
              : selectedPeriod.hint}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as ManagerReportPeriod)}
            disabled={loading}
          >
            <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
              <CalendarRange className="mr-1 size-4 text-muted-foreground" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl">
              {PERIODS.map((item) => (
                <SelectItem key={item.key} value={item.key} className="rounded-lg">
                  <span className="flex flex-col items-start py-0.5">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {report ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Visits" value={summary?.visits ?? report.visits} tone="navy" />
            <StatTile
              label="Gross revenue"
              value={`${money(summary?.revenue ?? report.revenue)} ETB`}
              tone="green"
            />
            <StatTile
              label="Net revenue"
              value={`${money(summary?.net_revenue ?? report.revenue)} ETB`}
              tone="green"
            />
            <StatTile
              label="Avg / visit"
              value={`${money(summary?.avg_revenue_per_visit ?? 0)} ETB`}
              tone="orange"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Payments"
              value={summary?.payment_count ?? report.payment_count}
              tone="navy"
            />
            <StatTile
              label="Refunds"
              value={`${money(summary?.refunds ?? 0)} ETB`}
              tone="rose"
            />
            <StatTile
              label="New patients"
              value={summary?.new_patients ?? report.new_patients}
              tone="navy"
            />
            <StatTile
              label="Billable lines"
              value={summary?.billable_items ?? 0}
              tone="orange"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              kicker="Cashier"
              title="Revenue by day"
              description="Collected payments grouped by calendar day in this window."
            >
              {(report.revenue_by_day || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments in this period.</p>
              ) : (
                <div className="space-y-2">
                  {(report.revenue_by_day || []).map((row) => (
                    <div
                      key={row.date}
                      className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/[0.02] px-3.5 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.date}</p>
                        <p className="text-[11px] text-muted-foreground">{row.count} payments</p>
                      </div>
                      <p className="font-heading text-sm font-semibold text-primary">
                        {money(row.total)} ETB
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Tender"
              title="Payment methods"
              description="How patients paid during the selected period."
            >
              {(report.tender_breakdown || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tender data yet.</p>
              ) : (
                <div className="space-y-2">
                  {(report.tender_breakdown || []).map((row) => (
                    <div
                      key={row.method}
                      className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="size-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{titleCase(row.method)}</p>
                          <p className="text-[11px] text-muted-foreground">{row.count} txns</p>
                        </div>
                      </div>
                      <p className="font-heading text-sm font-semibold">{money(row.total)} ETB</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Front desk"
              title="Arrival mix"
              description="New vs returning vs referred visits opened in-period."
            >
              {(report.arrival_breakdown || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits in this period.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  {(report.arrival_breakdown || []).map((row) => (
                    <div
                      key={row.arrival_type}
                      className="rounded-xl border border-primary/10 bg-linear-to-br from-white to-primary/3 px-3.5 py-3"
                    >
                      <p className="text-xs text-muted-foreground">{titleCase(row.arrival_type)}</p>
                      <p className="mt-1 font-heading text-2xl font-semibold text-primary">
                        {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Clinical volume"
              title="Orders & referrals"
              description="Diagnostic and pharmacy work created in this window."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Lab", value: summary?.lab_orders ?? report.lab_orders, icon: Beaker },
                  {
                    label: "Radiology",
                    value: summary?.radiology_orders ?? report.radiology_orders,
                    icon: ScanLine,
                  },
                  {
                    label: "Prescriptions",
                    value: summary?.prescriptions ?? report.prescriptions,
                    icon: Pill,
                  },
                  {
                    label: "Referrals",
                    value: summary?.referrals ?? report.referrals,
                    icon: Share2,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-primary/10 px-4 py-3"
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              kicker="Services"
              title="Top billed services"
              description="Most frequently charged lines in this period."
            >
              {(report.top_services || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No billable lines yet.</p>
              ) : (
                <div className="space-y-2">
                  {(report.top_services || []).map((row, index) => (
                    <div
                      key={`${row.description}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-primary/10 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.department || "General"} · {row.count}×
                        </p>
                      </div>
                      <p className="shrink-0 font-heading text-sm font-semibold">
                        {money(row.revenue)} ETB
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Pipeline"
              title="Order status mix"
              description="Where clinical orders sit across lab, radiology, and pharmacy."
            >
              {(report.order_status_breakdown || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in this period.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {(report.order_status_breakdown || []).map((row) => (
                    <div
                      key={`${row.order_type}-${row.status}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-2"
                    >
                      <p className="text-sm">
                        <span className="font-medium">{titleCase(row.order_type)}</span>
                        <span className="text-muted-foreground"> · {titleCase(row.status)}</span>
                      </p>
                      <p className="font-heading text-sm font-semibold">{row.count}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Referrals"
              title="Referral outcomes"
              description="Same-org vs outside referrals by approval status."
            >
              {(report.referral_breakdown || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No referrals in this period.</p>
              ) : (
                <div className="space-y-2">
                  {(report.referral_breakdown || []).map((row) => (
                    <div
                      key={`${row.kind}-${row.status}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        <p className="text-sm">
                          {titleCase(row.kind)} · {titleCase(row.status)}
                        </p>
                      </div>
                      <p className="font-heading text-sm font-semibold">{row.count}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Live snapshot"
              title="Stock & tickets now"
              description="Point-in-time branch health (not limited to the period)."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/40 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-rose-800">
                    <TrendingUp className="size-3.5" />
                    Low stock SKUs
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-rose-900">
                    {summary?.low_stock ?? report.low_stock}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3">
                  <p className="text-xs text-amber-900">Open equipment tickets</p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-amber-950">
                    {summary?.open_tickets ?? report.open_tickets}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
          {loading ? "Loading report…" : "No report data yet."}
        </div>
      )}
    </ClinicShell>
  );
}
