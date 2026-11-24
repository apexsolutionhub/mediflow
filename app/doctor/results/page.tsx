"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beaker,
  ClipboardList,
  Eye,
  Filter,
  ListFilter,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { LoadingButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { RadiologyReportView } from "@/components/diagnostics/RadiologyReport";
import { LabResultTable } from "@/components/diagnostics/LabResultTable";
import { abnormalSummary, type ClinicalOrder, formatStatus, orderTone } from "@/lib/clinic";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "lab" | "radiology" | "needs_review";

export default function DoctorResultsPage() {
  const [orders, setOrders] = useState<ClinicalOrder[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await api.get("/clinic/orders/", {
      params: { queue: "results", page_size: 100 },
    });
    setOrders(results<ClinicalOrder>(response.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load diagnostic results", { id: "doctor-results" }));
  }, [load]);

  const needsReview = useMemo(
    () => orders.filter((o) => o.status === "Completed"),
    [orders],
  );
  const labCount = useMemo(() => orders.filter((o) => o.order_type === "lab").length, [orders]);
  const radCount = useMemo(
    () => orders.filter((o) => o.order_type === "radiology").length,
    [orders],
  );

  const visible = useMemo(() => {
    if (filter === "lab") return orders.filter((o) => o.order_type === "lab");
    if (filter === "radiology") return orders.filter((o) => o.order_type === "radiology");
    if (filter === "needs_review") return needsReview;
    return orders;
  }, [filter, needsReview, orders]);

  const filterOptions = [
    {
      id: "all" as const,
      label: "All reports",
      count: orders.length,
      icon: ListFilter,
      tone: "navy" as const,
    },
    {
      id: "needs_review" as const,
      label: "Needs review",
      count: needsReview.length,
      icon: Eye,
      tone: "orange" as const,
    },
    {
      id: "lab" as const,
      label: "Laboratory",
      count: labCount,
      icon: Beaker,
      tone: "navy" as const,
    },
    {
      id: "radiology" as const,
      label: "Radiology",
      count: radCount,
      icon: ScanLine,
      tone: "orange" as const,
    },
  ];

  const activeFilter = filterOptions.find((option) => option.id === filter) ?? filterOptions[0];
  const ActiveIcon = activeFilter.icon;

  return (
    <ClinicShell
      title="Diagnostic results"
      subtitle="Lab and radiology reports sent by the units. Review them for the visit."
    >
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatTile label="All reports" value={orders.length} tone="navy" />
        <StatTile label="Needs review" value={needsReview.length} tone="orange" />
        <StatTile label="Reviewed" value={orders.length - needsReview.length} tone="green" />
      </div>

      <SectionCard
        kicker="Inbox"
        title="Results from lab & radiology"
        description="Reports appear here after the unit completes and sends them."
        action={
          <div className="flex flex-col items-stretch gap-1.5 sm:min-w-58">
            <span className="hidden text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:block sm:text-right">
              Show
            </span>
            <Combobox
              value={filter}
              onValueChange={(value) => setFilter(value as FilterKey)}
              align="end"
              searchable={false}
              className="h-11 rounded-2xl px-3"
              contentClassName="min-w-58"
              renderValue={() => (
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-lg ring-1",
                      activeFilter.tone === "orange"
                        ? "bg-cta/12 text-amber-800 ring-cta/20"
                        : "bg-primary/8 text-primary ring-primary/15",
                    )}
                  >
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 truncate font-medium text-primary">{activeFilter.label}</span>
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/8 px-1.5 text-[11px] font-semibold text-primary tabular-nums">
                    {activeFilter.count}
                  </span>
                </span>
              )}
              options={filterOptions.map((option) => {
                const Icon = option.icon;
                const selected = filter === option.id;
                return {
                  value: option.id,
                  label: option.label,
                  content: (
                    <span className="flex w-full min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "inline-flex size-7 shrink-0 items-center justify-center rounded-lg ring-1",
                          option.tone === "orange"
                            ? "bg-cta/12 text-amber-800 ring-cta/20"
                            : "bg-primary/8 text-primary ring-primary/15",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {option.count}
                      </span>
                    </span>
                  ),
                };
              })}
            />
          </div>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            title="No results yet"
            hint="When lab or radiology completes an order, the report lands here for review."
            icon={<ClipboardList className="size-5" />}
          />
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const isLab = order.order_type === "lab";
              const Icon = isLab ? Beaker : ScanLine;
              return (
                <QueueItem key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                            isLab
                              ? "bg-primary/5 text-primary"
                              : "bg-cta/12 text-amber-900",
                          )}
                        >
                          <Icon className="size-3.5" />
                          {isLab ? "Laboratory" : "Radiology"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.encounter_number}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-primary">
                        {order.patient_name}
                      </p>
                      <p className="font-heading text-lg font-semibold text-cta">
                        {order.test_name || order.details}
                      </p>
                      {order.test_name && order.details && order.details !== order.test_name ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                          <span className="font-medium text-primary/70">Note: </span>
                          {order.details}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusPill tone={orderTone(order.status)}>{formatStatus(order.status)}</StatusPill>
                      {abnormalSummary(order).count > 0 ? (
                        <StatusPill tone="red">
                          {abnormalSummary(order).critical
                            ? "Critical result"
                            : `${abnormalSummary(order).count} abnormal`}
                        </StatusPill>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-primary/10 bg-linear-to-br from-primary/3 to-white px-4 py-3.5">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-(--role-ink) uppercase">
                      {isLab ? "Lab result" : "Imaging findings"}
                    </p>
                    {order.radiology_report ? (
                      <div className="mt-2">
                        <RadiologyReportView report={order.radiology_report} />
                      </div>
                    ) : order.result_values?.length ? (
                      <div className="mt-2">
                        <LabResultTable values={order.result_values} />
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary/90">
                        {order.result_text || "No result text recorded."}
                      </p>
                    )}
                  </div>

                  {order.status === "Completed" ? (
                    <div className="mt-3">
                      <LoadingButton
                        size="sm"
                        className="h-9 rounded-xl bg-linear-to-r from-(--role) to-(--role-2) px-4 font-semibold text-white shadow-md shadow-(--role)/30 hover:brightness-105"
                        loading={busyId === order.id}
                        loadingLabel="Marking…"
                        onClick={async () => {
                          setBusyId(order.id);
                          try {
                            await api.post(`/clinic/orders/${order.id}/review/`);
                            toast.success("Marked as reviewed");
                            await load();
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        <Eye className="size-3.5" />
                        Mark reviewed
                      </LoadingButton>
                    </div>
                  ) : null}
                </QueueItem>
              );
            })}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
