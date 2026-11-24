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
import { type ClinicalOrder, type Medicine, formatStatus, orderTone } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { capacityFor, countWord, stockText, unitLabel, type SaleUnit } from "@/lib/medicine-stock";

export default function PharmacyQueuePage() {
  const [queue, setQueue] = useState<ClinicalOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
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
              // The doctor's order decides the medicine; the bill decides the quantity.
              const linked = order.medicine != null;
              const med = medicines.find((m) => m.id === order.medicine);
              const medName = order.medicine_name || med?.name || "";
              const qty = Math.max(1, order.dispense_quantity ?? 1);
              const saleUnit: SaleUnit = order.sale_unit === "loose" ? "loose" : "pack";
              // Words for what is being sold: "12 tablets" (loose) or "2 boxes" (whole packs).
              const unitWord = countWord(
                saleUnit === "loose"
                  ? (order.medicine_loose_unit || med?.loose_unit || "piece").toLowerCase()
                  : unitLabel(order.medicine_unit || med?.unit_of_measure).toLowerCase(),
                qty,
              );
              // Prefer the server's view of stock; fall back to the catalog on older servers.
              const stockNow = order.medicine_stock_text || (med ? stockText(med) : "");
              const stockAfter = order.medicine_stock_after_text ?? "";
              const enough =
                order.medicine_can_dispense ?? (med ? capacityFor(med, saleUnit) >= qty : true);
              const short = linked && !enough;
              const canDispense = linked && enough;
              // "Name · Freq: … · Duration: … · Fulfillment: …" -> just the directions.
              const directions = (order.details || "")
                .split(" · ")
                .map((part) => part.trim())
                .filter(
                  (part, i) =>
                    part &&
                    !/^fulfillment:/i.test(part) &&
                    !(i === 0 && medName && part.toLowerCase() === medName.toLowerCase()),
                )
                .join(" · ");
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
                      {directions ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                          <span className="font-medium text-primary/70">Directions: </span>
                          {directions}
                        </p>
                      ) : null}
                    </div>
                    <StatusPill tone={orderTone(order.status)}>{formatStatus(order.status)}</StatusPill>
                  </div>
                  <div className="mt-4 space-y-3 rounded-2xl border border-(--role)/20 bg-linear-to-br from-(--role)/6 to-white p-3.5">
                    {linked ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-(--role-ink) uppercase">
                              Medicine to dispense
                            </p>
                            <p className="font-heading text-lg leading-snug font-semibold text-primary">
                              {medName || "Ordered medicine"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-(--role)/25">
                              {unitWord}
                            </span>
                            {stockNow ? (
                              <StatusPill tone={short ? "red" : "green"}>
                                {stockNow} on hand
                                {!short && stockAfter ? ` → ${stockAfter} after` : ""}
                              </StatusPill>
                            ) : null}
                          </div>
                        </div>
                        {short ? (
                          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                            Not enough stock: {unitWord} needed, {stockNow} on hand. Restock
                            in Inventory before dispensing.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        This prescription isn&apos;t linked to a medicine in the clinic
                        inventory, so it can&apos;t be stocked out. Ask the doctor to re-issue
                        it from the medicine list.
                      </p>
                    )}
                    <LoadingButton
                      className="h-10 w-full rounded-xl font-semibold shadow-sm sm:w-auto"
                      disabled={!canDispense}
                      loading={dispensingId === order.id}
                      loadingLabel="Dispensing…"
                      onClick={async () => {
                        setDispensingId(order.id);
                        try {
                          // Older servers still read these; newer ones use the order itself.
                          await api.post(`/clinic/orders/${order.id}/dispense/`, {
                            medicine: order.medicine,
                            quantity: qty,
                          });
                          toast.success(
                            `Dispensed ${unitWord} of ${medName || "medicine"} — stock updated`,
                          );
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
                      <Pill className="size-4" />
                      Dispense &amp; stock out
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
