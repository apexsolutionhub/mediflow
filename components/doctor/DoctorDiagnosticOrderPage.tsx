"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Beaker, Eye, Plus, ScanLine } from "lucide-react";
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
import { api } from "@/lib/api";
import {
  type BillableService,
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
    defaultValues: { details: "", service: "" },
  });

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
                setSubmitting(true);
                try {
                  await api.post("/clinic/orders/", {
                    encounter: current.id,
                    order_type: orderType,
                    details: values.details,
                    service: values.service || undefined,
                  });
                  toast.success("Order sent — awaiting reception payment");
                  orderForm.reset({ details: "", service: "" });
                  await load(true);
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
                  Order details
                </p>
                <CustomFormField
                  control={orderForm.control}
                  name="service"
                  fieldType={formFieldTypes.SELECT}
                  label={meta.serviceLabel}
                  options={filteredServices.map((s) => ({
                    label: `${s.name}${s.description ? ` — ${s.description}` : ""} · ${s.unit_price} ETB`,
                    value: String(s.id),
                  }))}
                />
                <CustomFormField
                  control={orderForm.control}
                  name="details"
                  fieldType={formFieldTypes.TEXTAREA}
                  label="Clinical details"
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-heading font-semibold capitalize text-primary">
                            {order.order_type}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {order.details}
                          </p>
                          {order.result_text ? (
                            <div className="mt-3 rounded-xl border border-primary/10 bg-primary/3 px-3 py-2.5">
                              <p className="text-[10px] font-semibold tracking-[0.14em] text-cta uppercase">
                                Result
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-primary/90">
                                {order.result_text}
                              </p>
                            </div>
                          ) : null}
                          {order.status === "Completed" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-3 rounded-xl"
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
                        </div>
                      </div>
                      <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                    </div>
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
