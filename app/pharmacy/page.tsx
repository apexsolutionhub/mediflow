"use client";

import { useCallback, useEffect, useState } from "react";
import { Package2, Pill } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { LoadingButton } from "@/components/ui/submit-button";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicalOrder, type Medicine, orderTone } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";

export default function PharmacyQueuePage() {
  const [queue, setQueue] = useState<ClinicalOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pick, setPick] = useState<Record<number, { medicine: string; quantity: string }>>({});
  const [dispensingId, setDispensingId] = useState<number | null>(null);

  const load = useCallback(async (forceMeds = false) => {
    const [rx, meds] = await Promise.all([
      api.get("/clinic/orders/", { params: { queue: "pharmacy", page_size: 100 } }),
      fetchClinicCatalog<Medicine>(
        "medicines",
        "/clinic/medicines/",
        { page_size: 200 },
        forceMeds,
      ),
    ]);
    setQueue(results<ClinicalOrder>(rx.data));
    setMedicines(meds.filter((m) => m.is_active !== false));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load pharmacy queue", { id: "rx-queue" }));
  }, [load]);

  const lowStockCount = medicines.filter((m) => m.on_hand <= m.min_threshold).length;

  return (
    <ClinicShell
      title="Rx queue"
      subtitle="Dispense only payment-approved prescriptions. Stock updates on confirm."
    >
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatTile label="Waiting prescriptions" value={queue.length} tone="navy" />
        <StatTile label="Available medicines" value={medicines.length} tone="green" />
        <StatTile label="Low stock alerts" value={lowStockCount} tone="rose" />
      </div>

      <SectionCard
        kicker="Approved Rx"
        title="Dispense queue"
        description="Premium dispense workflow with quick stock visibility and safer handoff."
        action={<StatusPill tone="orange">{queue.length} waiting</StatusPill>}
      >
        {queue.length === 0 ? (
          <EmptyState
            title="No prescriptions ready"
            hint="Unpaid Rx never appears here — payment approval is required."
            icon={<Pill className="size-5" />}
          />
        ) : (
          <div className="space-y-4">
            {queue.map((order) => {
              const sel = pick[order.id] || { medicine: "", quantity: "1" };
              return (
                <QueueItem key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-800">
                          <Pill className="size-3.5" />
                          Prescription
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
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="grid min-w-60 gap-1.5 text-xs font-semibold text-muted-foreground">
                      Medicine
                      <select
                        className="h-11 min-w-45 rounded-xl border border-primary/10 bg-slate-50 px-3.5 text-sm text-foreground shadow-inner outline-none transition focus:border-cta/40 focus:bg-white"
                        value={sel.medicine}
                        onChange={(e) =>
                          setPick((p) => ({
                            ...p,
                            [order.id]: { ...sel, medicine: e.target.value },
                          }))
                        }
                      >
                        <option value="">Select…</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            {m.name} ({m.on_hand} on hand)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                      Qty
                      <input
                        type="number"
                        min={1}
                        className="h-11 w-22 rounded-xl border border-primary/10 bg-slate-50 px-3.5 text-sm shadow-inner outline-none transition focus:border-cta/40 focus:bg-white"
                        value={sel.quantity}
                        onChange={(e) =>
                          setPick((p) => ({
                            ...p,
                            [order.id]: { ...sel, quantity: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <LoadingButton
                      className="shadow-sm"
                      loading={dispensingId === order.id}
                      loadingLabel="Dispensing…"
                      onClick={async () => {
                        if (!sel.medicine) {
                          toast.error("Pick a medicine");
                          return;
                        }
                        setDispensingId(order.id);
                        try {
                          await api.post(`/clinic/orders/${order.id}/dispense/`, {
                            medicine: Number(sel.medicine),
                            quantity: Number(sel.quantity) || 1,
                          });
                          toast.success("Dispensed — stock updated");
                          await load(true);
                        } catch (error: unknown) {
                          toast.error(
                            String(
                              (error as { response?: { data?: { detail?: string } } })
                                ?.response?.data?.detail || "Dispense failed",
                            ),
                          );
                        } finally {
                          setDispensingId(null);
                        }
                      }}
                    >
                      Dispense / stock-out
                    </LoadingButton>
                  </div>
                </QueueItem>
              );
            })}
          </div>
        )}
      </SectionCard>

      {medicines.length > 0 ? (
        <SectionCard
          className="mt-6"
          kicker="Stock insight"
          title="Inventory pulse"
          description="Live on-hand snapshot for the medicines you dispense most."
          action={<Package2 className="size-5 text-primary/70" />}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {medicines.slice(0, 6).map((medicine) => {
              const low = medicine.on_hand <= medicine.min_threshold;
              return (
                <div
                  key={medicine.id}
                  className="rounded-2xl border border-primary/10 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{medicine.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Threshold {medicine.min_threshold}
                      </p>
                    </div>
                    <StatusPill tone={low ? "red" : "green"}>
                      {low ? "Low" : "Healthy"}
                    </StatusPill>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-primary">{medicine.on_hand}</p>
                  <p className="text-xs text-muted-foreground">units on hand</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
