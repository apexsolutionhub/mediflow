"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { isSplittable, looseUnitPrice, stockText, unitLabel } from "@/lib/medicine-stock";
import { StockLevelChart } from "@/components/charts/StockLevelChart";
import {
  EmptyState,
  QueueItem,
  ScrollableCatalog,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { type Medicine, money } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";

export default function PharmacyInventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const load = useCallback(async (force = false) => {
    const rows = await fetchClinicCatalog<Medicine>(
      "medicines",
      "/clinic/medicines/",
      { page_size: 200 },
      force,
    );
    setMedicines(rows.filter((m) => m.is_active !== false));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load inventory", { id: "rx-inv" }));
  }, [load]);

  const lowStockCount = medicines.filter((m) => m.on_hand <= m.min_threshold).length;

  return (
    <ClinicShell
      title="Inventory"
      subtitle="On-hand stock and low-threshold alerts."
    >
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile label="Catalog size" value={medicines.length} tone="navy" />
        <StatTile label="Low stock alerts" value={lowStockCount} tone="rose" />
      </div>

      <SectionCard
        className="mb-6"
        kicker="Stock health"
        title="Closest to running out"
        description="On-hand units against the reorder level, lowest cover first."
      >
        <StockLevelChart medicines={medicines} />
      </SectionCard>

      <SectionCard
        kicker="Pharmacy stock"
        title="Medicine inventory"
        description="Track on-hand units against reorder thresholds."
      >
        {medicines.length === 0 ? (
          <EmptyState
            title="No medicines yet"
            hint="Manager can seed the catalog from inventory tools."
          />
        ) : (
          <ScrollableCatalog itemCount={medicines.length}>
            <div className="space-y-3">
              {medicines.map((m) => {
                const low = m.on_hand <= m.min_threshold;
                const expiry = m.expiry_date ? new Date(`${m.expiry_date.slice(0, 10)}T23:59:59`) : null;
                const expired = expiry !== null && expiry.getTime() < Date.now();
                return (
                  <QueueItem key={m.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="font-heading font-semibold text-primary">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {money(m.unit_price)} ETB / {unitLabel(m.unit_of_measure).toLowerCase()}
                          {isSplittable(m)
                            ? ` · ${money(looseUnitPrice(m))} / ${(m.loose_unit || "piece").toLowerCase()}`
                            : ""}
                          {` · min ${m.min_threshold}`}
                        </p>
                        {m.batch_number || expiry ? (
                          <p className="text-xs text-muted-foreground">
                            {m.batch_number ? `Batch ${m.batch_number}` : ""}
                            {m.batch_number && expiry ? " · " : ""}
                            {expiry ? (
                              <span className={expired ? "font-semibold text-rose-600" : undefined}>
                                {expired ? "Expired " : "Exp "}
                                {expiry.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <StatusPill tone={low ? "red" : "green"}>{m.stock_text || stockText(m)} on hand</StatusPill>
                    </div>
                  </QueueItem>
                );
              })}
            </div>
          </ScrollableCatalog>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
