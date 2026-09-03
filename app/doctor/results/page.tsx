"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Beaker, ClipboardList, Eye, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/submit-button";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicalOrder, orderTone } from "@/lib/clinic";
import { cn } from "@/lib/utils";

type Filter = "all" | "lab" | "radiology" | "needs_review";

export default function DoctorResultsPage() {
  const [orders, setOrders] = useState<ClinicalOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All", count: orders.length },
            { id: "needs_review" as const, label: "Needs review", count: needsReview.length },
            { id: "lab" as const, label: "Laboratory", count: labCount },
            { id: "radiology" as const, label: "Radiology", count: radCount },
          ] as const
        ).map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            className={cn(
              "rounded-xl",
              filter === item.id && "bg-primary text-primary-foreground",
            )}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="ml-1 rounded-full bg-white/15 px-1.5 text-[11px]">{item.count}</span>
          </Button>
        ))}
      </div>

      <SectionCard
        kicker="Inbox"
        title="Results from lab & radiology"
        description="Reports appear here after the unit completes and sends them."
        action={<StatusPill tone="navy">{visible.length} shown</StatusPill>}
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
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {order.details}
                      </p>
                    </div>
                    <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                  </div>

                  <div className="mt-4 rounded-2xl border border-primary/10 bg-linear-to-br from-primary/3 to-white px-4 py-3.5">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-cta uppercase">
                      {isLab ? "Lab result" : "Imaging findings"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary/90">
                      {order.result_text || "No result text recorded."}
                    </p>
                  </div>

                  {order.status === "Completed" ? (
                    <div className="mt-3">
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-primary/15 bg-white"
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
