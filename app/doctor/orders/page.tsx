"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Beaker, Pill, Plus, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Button } from "@/components/ui/button";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type BillableService, ORDER_TYPE_TO_SERVICE_TYPE, orderTone } from "@/lib/clinic";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

const ORDER_ICONS = {
  lab: Beaker,
  radiology: ScanLine,
  prescription: Pill,
} as const;

export default function DoctorOrdersPage() {
  const { current, load } = useEncounterBoard("doctor");
  const [services, setServices] = useState<BillableService[]>([]);
  const orderForm = useForm({
    defaultValues: { order_type: "lab", details: "", service: "" },
  });

  const loadServices = useCallback(async () => {
    const svc = await api.get("/clinic/services/", { params: { page_size: 100 } });
    setServices(results<BillableService>(svc.data).filter((s) => s.is_active !== false));
  }, []);

  useEffect(() => {
    loadServices().catch(() => toast.error("Could not load services"));
  }, [loadServices]);

  const orderType = orderForm.watch("order_type");
  const filteredServices = useMemo(() => {
    const targetType = ORDER_TYPE_TO_SERVICE_TYPE[orderType];
    if (!targetType) return services;
    const matched = services.filter((s) => (s.service_type || "other") === targetType);
    return matched.length ? matched : services;
  }, [services, orderType]);

  return (
    <ClinicShell
      title="Orders"
      subtitle="Lab, radiology, and Rx — each order awaits reception payment before work starts."
    >
      <SelectedVisitBanner encounter={current} boardHref="/doctor" boardLabel="active visits" />
      {current ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            kicker="New order"
            title="Create order"
            description="Payment-gated — reception must approve before lab or pharmacy starts."
          >
            <form
              className="grid gap-4"
              onSubmit={orderForm.handleSubmit(async (values) => {
                await api.post("/clinic/orders/", {
                  encounter: current.id,
                  order_type: values.order_type,
                  details: values.details,
                  service: values.service || undefined,
                });
                toast.success("Order sent — awaiting reception payment");
                orderForm.reset({ order_type: values.order_type, details: "", service: "" });
                await load();
              })}
            >
              <CustomFormField
                control={orderForm.control}
                name="order_type"
                fieldType={formFieldTypes.SELECT}
                label="Type"
                options={[
                  { label: "Lab", value: "lab" },
                  { label: "Radiology", value: "radiology" },
                  { label: "Prescription", value: "prescription" },
                ]}
              />
              <CustomFormField
                control={orderForm.control}
                name="service"
                fieldType={formFieldTypes.SELECT}
                label="Billable service"
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
              <Button type="submit" className={ctaButtonClass}>
                <Plus className="size-4" />
                Create order
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            kicker="This visit"
            title="Order history"
            description="Track status from payment through completion."
            action={
              current.orders?.length ? (
                <StatusPill tone="navy">{current.orders.length} orders</StatusPill>
              ) : undefined
            }
          >
            {!current.orders?.length ? (
              <EmptyState title="No orders yet" hint="Create a lab, radiology, or Rx order above." />
            ) : (
              <div className="space-y-3">
                {current.orders.map((order) => {
                  const Icon = ORDER_ICONS[order.order_type as keyof typeof ORDER_ICONS] ?? Beaker;
                  return (
                    <QueueItem key={order.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0 text-primary/70" />
                            <p className="font-heading font-semibold capitalize text-primary">
                              {order.order_type}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{order.details}</p>
                          {order.result_text ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Result: {order.result_text}
                            </p>
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
                                await load();
                              }}
                            >
                              Mark reviewed
                            </Button>
                          ) : null}
                        </div>
                        <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
