"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Beaker, Check, Eye, Plus, ScanLine, Search } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatusPill,
} from "@/components/ui-chrome";
import { RadiologyReportView } from "@/components/diagnostics/RadiologyReport";
import { LabResultTable } from "@/components/diagnostics/LabResultTable";
import { api } from "@/lib/api";
import {
  abnormalSummary,
  type BillableService,
  formatStatus,
  ORDER_TYPE_TO_SERVICE_TYPE,
  orderTone,
} from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type DiagnosticOrderType = "lab" | "radiology";

const META: Record<
  DiagnosticOrderType,
  { title: string; subtitle: string; kicker: string; serviceLabel: string; icon: typeof Beaker }
> = {
  lab: {
    title: "Laboratory orders",
    subtitle: "Order lab tests for the selected visit. Work starts after reception payment approval.",
    kicker: "Laboratory",
    serviceLabel: "Lab service",
    icon: Beaker,
  },
  radiology: {
    title: "Radiology orders",
    subtitle: "Order imaging for the selected visit. Work starts after reception payment approval.",
    kicker: "Radiology",
    serviceLabel: "Imaging service",
    icon: ScanLine,
  },
};

export function DoctorDiagnosticOrderPage({ orderType }: { orderType: DiagnosticOrderType }) {
  const meta = META[orderType];
  const Icon = meta.icon;
  const { encounters, current, selectedId, setSelectedId, load } = useEncounterBoard("doctor");
  const [services, setServices] = useState<BillableService[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const orderForm = useForm({
    defaultValues: { details: "" },
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");

  const loadServices = useCallback(async () => {
    const rows = await fetchClinicCatalog<BillableService>(
      "services",
      "/clinic/services/",
      { page_size: 100 },
    );
    setServices(rows.filter((s) => s.is_active !== false));
  }, []);

  useEffect(() => {
    loadServices().catch(() => toast.error("Could not load services"));
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const targetType = ORDER_TYPE_TO_SERVICE_TYPE[orderType];
    const matched = services.filter((s) => (s.service_type || "other") === targetType);
    return matched.length ? matched : services.filter((s) => (s.service_type || "") === targetType);
  }, [services, orderType]);

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? filteredServices.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(q))
      : filteredServices;
  }, [filteredServices, query]);

  const selectedTotal = useMemo(
    () =>
      filteredServices
        .filter((s) => selected.includes(s.id))
        .reduce((sum, s) => sum + Number(s.unit_price || 0), 0),
    [filteredServices, selected],
  );

  const history = useMemo(
    () => (current?.orders ?? []).filter((o) => o.order_type === orderType),
    [current?.orders, orderType],
  );

  return (
    <ClinicShell title={meta.title} subtitle={meta.subtitle}>
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <div className="grid gap-6 xl:grid-cols-5">
          <SectionCard
            kicker={meta.kicker}
            title={`New ${orderType === "lab" ? "lab" : "imaging"} order`}
            description="Payment-gated — reception must approve before the unit starts work."
            className="xl:col-span-3"
          >
            <VisitPatientStrip encounter={current} className="mb-4" />
            <form
              className="space-y-4"
              onSubmit={orderForm.handleSubmit(async (values) => {
                if (!selected.length) {
                  toast.error(`Select at least one ${orderType === "lab" ? "test" : "study"}`);
                  return;
                }
                setSubmitting(true);
                try {
                  // One order per test so each is billed, tracked and resulted on its own.
                  for (const serviceId of selected) {
                    await api.post("/clinic/orders/", {
                      encounter: current.id,
                      order_type: orderType,
                      details:
                        values.details?.trim() ||
                        services.find((s) => s.id === serviceId)?.name ||
                        "Order",
                      service: serviceId,
                    });
                  }
                  toast.success(
                    selected.length > 1
                      ? `${selected.length} orders sent — awaiting reception payment`
                      : "Order sent — awaiting reception payment",
                  );
                  orderForm.reset({ details: "" });
                  setSelected([]);
                  await load(true);
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-(--role-ink) uppercase">
                  Order details
                </p>
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary">
                      {meta.serviceLabel}s
                      <span className="ml-2 rounded-full bg-(--role)/12 px-2 py-0.5 text-[11px] font-semibold text-(--role-ink)">
                        {selected.length} selected
                        {selectedTotal > 0 ? ` · ${selectedTotal.toLocaleString()} ETB` : ""}
                      </span>
                    </p>
                    {selected.length ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                        onClick={() => setSelected([])}
                      >
                        Clear selection
                      </button>
                    ) : null}
                  </div>
                  {filteredServices.length > 6 ? (
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${orderType === "lab" ? "tests" : "studies"}…`}
                        className="h-10 w-full rounded-xl border border-primary/15 bg-white pr-3 pl-9 text-sm shadow-xs outline-none focus:border-(--role)/50 focus:ring-3 focus:ring-(--role)/15"
                      />
                    </div>
                  ) : null}
                  {filteredServices.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-primary/20 p-3 text-sm text-muted-foreground">
                      No active {orderType === "lab" ? "lab tests" : "imaging services"} in the
                      catalog. Ask the manager to add or activate them under Billables.
                    </p>
                  ) : visibleServices.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-primary/20 p-3 text-sm text-muted-foreground">
                      Nothing matches &ldquo;{query}&rdquo;.
                    </p>
                  ) : (
                    <div className="@container">
                      <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-(--role)/15 bg-(--role)/4 p-2 @md:grid-cols-2">
                        {visibleServices.map((s) => {
                          const on = selected.includes(s.id);
                          const fields = s.parameters?.length ?? 0;
                          return (
                            <label
                              key={s.id}
                              className={cn(
                                "group/test relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm shadow-xs transition-all duration-150",
                                on
                                  ? "border-(--role) bg-(--role)/8 shadow-md shadow-(--role)/15"
                                  : "border-slate-200 hover:-translate-y-px hover:border-(--role)/40 hover:shadow-sm",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={on}
                                onChange={() =>
                                  setSelected((prev) =>
                                    on ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                                  )
                                }
                              />
                              <span
                                aria-hidden
                                className={cn(
                                  "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-(--role)/30",
                                  on
                                    ? "border-(--role) bg-(--role) text-white"
                                    : "border-slate-300 bg-white text-transparent",
                                )}
                              >
                                <Check className="size-3.5" strokeWidth={3} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block leading-snug font-semibold text-primary">
                                  {s.name}
                                </span>
                                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                                    {Number(s.unit_price).toLocaleString()} ETB
                                  </span>
                                  {fields > 0 ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                      {fields} {fields === 1 ? "result" : "results"}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <CustomFormField
                  control={orderForm.control}
                  name="details"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Clinical note (optional)"
                />
              </div>

              <div className="sticky bottom-3 z-10 rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-lg shadow-primary/10 backdrop-blur-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 px-1">
                    <p className="text-sm font-semibold text-primary">
                      Send {orderType === "lab" ? "lab" : "imaging"} order
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Work starts after reception payment approval.
                    </p>
                  </div>
                  <SubmitButton
                    className={cn(ctaButtonClass, "sm:min-w-44")}
                    loading={submitting}
                    loadingLabel="Sending…"
                  >
                    <Plus className="size-4" />
                    Create order
                  </SubmitButton>
                </div>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            kicker="This visit"
            title={`${meta.kicker} history`}
            description="Track status from payment through completion."
            className="xl:col-span-2"
            action={
              history.length ? (
                <StatusPill tone="navy">{history.length} orders</StatusPill>
              ) : undefined
            }
          >
            {!history.length ? (
              <EmptyState
                title="No orders yet"
                hint={`Create a ${orderType === "lab" ? "laboratory" : "radiology"} order on the left.`}
                icon={<Icon className="size-5" />}
              />
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <QueueItem key={order.id}>
                    {/* Header: icon + title on the left, status on the right (wraps below on tiny screens). */}
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="flex min-w-0 flex-1 basis-48 items-start gap-3">
                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-primary">
                            {order.test_name || order.order_type}
                          </p>
                          {order.test_name && order.details && order.details !== order.test_name ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {order.details}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <StatusPill tone={orderTone(order.status)}>
                          {formatStatus(order.status)}
                        </StatusPill>
                        {abnormalSummary(order).count > 0 ? (
                          <StatusPill tone="red">
                            {abnormalSummary(order).critical
                              ? "Critical result"
                              : `${abnormalSummary(order).count} abnormal`}
                          </StatusPill>
                        ) : null}
                      </div>
                    </div>

                    {/* Result: full card width, never squeezed beside the icon. */}
                    {order.radiology_report ? (
                      <div className="mt-3">
                        <RadiologyReportView report={order.radiology_report} />
                      </div>
                    ) : order.result_values?.length ? (
                      <div className="mt-3">
                        <LabResultTable values={order.result_values} />
                      </div>
                    ) : order.result_text ? (
                      <div className="mt-3 rounded-xl border border-primary/10 bg-primary/3 px-3 py-2.5">
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-(--role-ink) uppercase">
                          Result
                        </p>
                        <p className="mt-1 text-sm leading-5 whitespace-pre-wrap text-primary/90">
                          {order.result_text}
                        </p>
                      </div>
                    ) : null}
                    {order.status === "Completed" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 h-9 rounded-xl bg-linear-to-r from-(--role) to-(--role-2) px-4 font-semibold text-white shadow-md shadow-(--role)/30 hover:brightness-105"
                        onClick={async () => {
                          await api.post(`/clinic/orders/${order.id}/review/`);
                          toast.success("Result marked reviewed");
                          await load(true);
                        }}
                      >
                        <Eye className="size-3.5" />
                        Mark reviewed
                      </Button>
                    ) : null}
                  </QueueItem>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
