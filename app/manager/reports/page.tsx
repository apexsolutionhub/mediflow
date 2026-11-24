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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { ClinicShell } from "@/components/clinic-shell";
import {
  buildSeries,
  CHART_COLORS,
  ChartEmpty,
  DonutChart,
  HBarChart,
  StackedBars,
  TrendChart,
} from "@/components/charts/chart-kit";
import { ReportDatePicker } from "@/components/manager/ReportDatePicker";
import { SectionCard, StatTile } from "@/components/ui-chrome";
import { Combobox } from "@/components/ui/combobox";
import { api } from "@/lib/api";
import {
  money,
  type ManagerReport,
  type ManagerReportPeriod,
} from "@/lib/clinic";

const PERIODS: { key: ManagerReportPeriod; label: string; hint: string }[] = [
  { key: "day", label: "Daily", hint: "Just the selected day" },
  { key: "month", label: "Monthly", hint: "The month of the selected day" },
  { key: "quarter", label: "Quarterly", hint: "The quarter of the selected day" },
  { key: "half_year", label: "Half-year", hint: "The half-year of the selected day" },
  { key: "year", label: "Yearly", hint: "The year of the selected day" },
];

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManagerReportsPage() {
  const [period, setPeriod] = useState<ManagerReportPeriod>("month");
  const [report, setReport] = useState<ManagerReport | null>(null);
  // The calendar picks one day; the period selector widens it to that day's month, quarter...
  const [day, setDay] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);

  const dayKey = day ? format(day, "yyyy-MM-dd") : "";

  const load = useCallback(async (next: ManagerReportPeriod, date: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<ManagerReport>("/clinic/reports/", {
        params: date ? { period: next, date } : { period: next },
      });
      setReport(data);
    } catch (error) {
      setReport(null);
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(detail || "Could not load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period, dayKey);
  }, [load, period, dayKey]);

  const revenueSeries = useMemo(
    () =>
      report
        ? buildSeries(
            report.start_date,
            report.end_date,
            (report.revenue_by_day || []).map((r) => ({ date: r.date, value: Number(r.total) })),
          )
        : [],
    [report],
  );
  const visitSeries = useMemo(
    () =>
      report?.visits_by_day
        ? buildSeries(
            report.start_date,
            report.end_date,
            report.visits_by_day.map((r) => ({ date: r.date, value: r.count })),
          )
        : null,
    [report],
  );
  const orderPivot = useMemo(() => {
    const rows = report?.order_status_breakdown || [];
    const statuses = Array.from(new Set(rows.map((r) => titleCase(r.status))));
    const byType = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      const cat = titleCase(r.order_type);
      const row = byType.get(cat) ?? { category: cat };
      row[titleCase(r.status)] = Number(row[titleCase(r.status)] ?? 0) + r.count;
      byType.set(cat, row);
    }
    return { statuses, rows: Array.from(byType.values()) };
  }, [report]);
  // An older backend ignores `date` and answers for today's window instead.
  const dateIgnored =
    Boolean(dayKey) &&
    !loading &&
    report !== null &&
    !(report.start_date <= dayKey && dayKey <= report.end_date);

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
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
        <ReportDatePicker
          value={day}
          onChange={setDay}
          disabled={loading}
          className="w-full sm:flex-1 lg:w-64 lg:flex-none"
        />
        <div className="w-full sm:flex-1 lg:w-56 lg:flex-none">
          <Combobox
            value={period}
            onValueChange={(value) => setPeriod(value as ManagerReportPeriod)}
            disabled={loading}
            searchable={false}
            className="h-11 rounded-xl"
            renderValue={() => (
              <span className="flex items-center gap-2">
                <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedPeriod.label}</span>
              </span>
            )}
            options={PERIODS.map((item) => ({
              value: item.key,
              label: item.label,
              content: (
                <span className="flex flex-col items-start py-0.5">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                </span>
              ),
            }))}
          />
        </div>
        </div>
      </div>

      {dateIgnored ? (
        <div className="mb-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Picking a day needs the latest backend update, so this is still showing the current{" "}
          {report?.period_label?.toLowerCase()} window.
        </div>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              title="Revenue"
              description="Collected payments per day (grouped by month for windows over two months)."
            >
              {revenueSeries.some((p) => p.value > 0) ? (
                <>
                  <TrendChart
                    data={revenueSeries}
                    label="Revenue"
                    kind="bar"
                    color={CHART_COLORS[2]}
                    format={(v) => `${money(v)} ETB`}
                  />
                  <details className="mt-4 rounded-xl border border-primary/10 px-3.5 py-2.5 text-sm">
                    <summary className="cursor-pointer font-medium text-primary">
                      Daily breakdown ({(report.revenue_by_day || []).length})
                    </summary>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {(report.revenue_by_day || []).map((row) => (
                        <div key={row.date} className="flex items-center justify-between gap-3">
                          <span>
                            {row.date}
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              {row.count} payments
                            </span>
                          </span>
                          <span className="font-heading font-semibold text-primary">
                            {money(row.total)} ETB
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <ChartEmpty message="No payments in this period." />
              )}
            </SectionCard>

            <SectionCard
              kicker="Front desk"
              title="Visits"
              description="Visits opened per day."
            >
              {visitSeries === null ? (
                <ChartEmpty message="The visit trend appears after the latest backend update." />
              ) : visitSeries.some((p) => p.value > 0) ? (
                <TrendChart
                  data={visitSeries}
                  label="Visits"
                  color={CHART_COLORS[0]}
                  format={(v) => `${v} visits`}
                />
              ) : (
                <ChartEmpty message="No visits in this period." />
              )}
            </SectionCard>

            <SectionCard
              kicker="Tender"
              title="Payment methods"
              description="How patients paid during the selected period (ETB)."
            >
              <DonutChart
                data={(report.tender_breakdown || []).map((r) => ({
                  name: titleCase(r.method),
                  value: Number(r.total),
                }))}
                format={(v) => money(v)}
                centerLabel="ETB"
              />
            </SectionCard>

            <SectionCard
              kicker="Front desk"
              title="Arrival mix"
              description="New vs returning vs referred visits opened in-period."
            >
              <DonutChart
                data={(report.arrival_breakdown || []).map((r) => ({
                  name: titleCase(r.arrival_type),
                  value: r.count,
                }))}
                centerLabel="Visits"
              />
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
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
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
              <HBarChart
                data={(report.top_services || []).map((r) => ({
                  name: r.description,
                  value: r.count,
                }))}
                label="Times billed"
                color={CHART_COLORS[1]}
                labelWidth={130}
              />
            </SectionCard>

            <SectionCard
              kicker="Pipeline"
              title="Order status mix"
              description="Where clinical orders sit across lab, radiology, and pharmacy."
            >
              <StackedBars rows={orderPivot.rows} series={orderPivot.statuses} />
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
