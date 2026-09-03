"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Beaker, Pill, Plus, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
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
  type Medicine,
  ORDER_TYPE_TO_SERVICE_TYPE,
  orderTone,
} from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

const ORDER_ICONS = {
  lab: Beaker,
  radiology: ScanLine,
  prescription: Pill,
} as const;

type OrderFormValues = {
  order_type: string;
  details: string;
  service: string;
  medicine: string;
  fulfillment: "clinic_pharmacy" | "external_print";
  dose: string;
  frequency: string;
  duration: string;
};

export default function DoctorOrdersPage() {
  const { encounters, current, selectedId, setSelectedId, load } = useEncounterBoard("doctor");
  const [services, setServices] = useState<BillableService[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const orderForm = useForm<OrderFormValues>({
    defaultValues: {
      order_type: "lab",
      details: "",
      service: "",
      medicine: "",
      fulfillment: "clinic_pharmacy",
      dose: "",
      frequency: "",
      duration: "",
    },
  });

  const loadCatalog = useCallback(async () => {
    const [serviceRows, medicineRows] = await Promise.all([
      fetchClinicCatalog<BillableService>("services", "/clinic/services/", { page_size: 100 }),
      fetchClinicCatalog<Medicine>("medicines", "/clinic/medicines/", { page_size: 200 }),
    ]);
    setServices(serviceRows.filter((s) => s.is_active !== false));
    setMedicines(medicineRows.filter((m) => m.is_active !== false));
  }, []);

  useEffect(() => {
    loadCatalog().catch(() => toast.error("Could not load catalog"));
  }, [loadCatalog]);

  const orderType = orderForm.watch("order_type");
  const fulfillment = orderForm.watch("fulfillment");
  const isRx = orderType === "prescription";

  const filteredServices = useMemo(() => {
    const targetType = ORDER_TYPE_TO_SERVICE_TYPE[orderType];
    if (!targetType) return services;
    const matched = services.filter((s) => (s.service_type || "other") === targetType);
    return matched.length ? matched : services;
  }, [services, orderType]);

  return (
    <ClinicShell
      title="Orders"
      subtitle="Lab, radiology, and medicine orders. Clinic pharmacy Rx stays inactive until reception approves payment."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            kicker="New order"
            title="Create order"
            description="Use Prescription when no referral or follow-up is needed — send to pharmacy or print externally at checkout."
          >
            <form
              className="grid gap-4"
              onSubmit={orderForm.handleSubmit(async (values) => {
                setSubmitting(true);
                try {
                  let details = values.details.trim();
                  if (values.order_type === "prescription") {
                    const med = medicines.find((m) => String(m.id) === values.medicine);
                    const parts = [
                      med ? med.name : null,
                      values.dose ? `Dose: ${values.dose}` : null,
                      values.frequency ? `Freq: ${values.frequency}` : null,
                      values.duration ? `Duration: ${values.duration}` : null,
                      values.fulfillment === "external_print"
                        ? "Fulfillment: external (print at checkout)"
                        : "Fulfillment: clinic pharmacy",
                      details || null,
                    ].filter(Boolean);
                    details = parts.join(" · ");
                    if (!med && !values.details.trim()) {
                      toast.error("Select a medicine or enter prescription details.");
                      return;
                    }
                  }
                  await api.post("/clinic/orders/", {
                    encounter: current.id,
                    order_type: values.order_type,
                    details,
                    service: values.service || undefined,
                    medicine: values.medicine || undefined,
                    fulfillment: values.order_type === "prescription" ? values.fulfillment : undefined,
                  });
                  toast.success(
                    values.order_type === "prescription" && values.fulfillment === "clinic_pharmacy"
                      ? "Prescription sent — inactive until reception approves payment"
                      : values.order_type === "prescription"
                        ? "External prescription recorded — print at checkout"
                        : "Order sent — awaiting reception payment",
                  );
                  orderForm.reset({
                    order_type: values.order_type,
                    details: "",
                    service: "",
                    medicine: "",
                    fulfillment: values.fulfillment,
                    dose: "",
                    frequency: "",
                    duration: "",
                  });
                  await load(true);
                } finally {
                  setSubmitting(false);
                }
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
                  { label: "Prescription (medicine)", value: "prescription" },
                ]}
              />
              {isRx ? (
                <>
                  <CustomFormField
                    control={orderForm.control}
                    name="fulfillment"
                    fieldType={formFieldTypes.SELECT}
                    label="Where dispensed"
                    options={[
                      {
                        label: "Clinic pharmacy",
                        value: "clinic_pharmacy",
                        description: "Queued for pharmacy after payment approval",
                      },
                      {
                        label: "Outside pharmacy (print)",
                        value: "external_print",
                        description: "Printed for the patient at checkout",
                      },
                    ]}
                  />
                  <CustomFormField
                    control={orderForm.control}
                    name="medicine"
                    fieldType={formFieldTypes.SELECT}
                    label="Medicine"
                    placeholder="Select from clinic formulary"
                    options={medicines.map((m) => ({
                      label: `${m.name}${m.on_hand != null ? ` · stock ${m.on_hand}` : ""}`,
                      value: String(m.id),
                      description: m.description || m.category || undefined,
                    }))}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <CustomFormField
                      control={orderForm.control}
                      name="dose"
                      fieldType={formFieldTypes.INPUT}
                      label="Dose"
                      placeholder="e.g. 500mg"
                    />
                    <CustomFormField
                      control={orderForm.control}
                      name="frequency"
                      fieldType={formFieldTypes.INPUT}
                      label="Frequency"
                      placeholder="e.g. BID"
                    />
                    <CustomFormField
                      control={orderForm.control}
                      name="duration"
                      fieldType={formFieldTypes.INPUT}
                      label="Duration"
                      placeholder="e.g. 5 days"
                    />
                  </div>
                </>
              ) : (
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
              )}
              {isRx && fulfillment === "clinic_pharmacy" ? (
                <CustomFormField
                  control={orderForm.control}
                  name="service"
                  fieldType={formFieldTypes.SELECT}
                  label="Pharmacy billable (optional)"
                  options={filteredServices.map((s) => ({
                    label: `${s.name} · ${s.unit_price} ETB`,
                    value: String(s.id),
                  }))}
                />
              ) : null}
              <CustomFormField
                control={orderForm.control}
                name="details"
                fieldType={formFieldTypes.TEXTAREA}
                label={isRx ? "Additional Rx notes" : "Clinical details"}
              />
              <SubmitButton className={ctaButtonClass} loading={submitting} loadingLabel="Sending…">
                <Plus className="size-4" />
                {isRx ? "Send prescription" : "Create order"}
              </SubmitButton>
            </form>
          </SectionCard>

          <SectionCard
            kicker="This visit"
            title="Order history"
            description="Clinic pharmacy lines stay inactive until payment; external Rx print at checkout."
            action={
              current.orders?.length ? (
                <StatusPill tone="navy">{current.orders.length} orders</StatusPill>
              ) : undefined
            }
          >
            {!current.orders?.length ? (
              <EmptyState title="No orders yet" hint="Create a lab, radiology, or medicine order above." />
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
                                await load(true);
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
