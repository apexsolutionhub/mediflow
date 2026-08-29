"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api } from "@/lib/api";
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
    setMedicines(rows);
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
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatTile label="Catalog size" value={medicines.length} tone="navy" />
        <StatTile label="Low stock alerts" value={lowStockCount} tone="rose" />
      </div>

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
          <div className="space-y-3">
            {medicines.map((m) => {
              const low = m.on_hand <= m.min_threshold;
              return (
                <QueueItem key={m.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading font-semibold text-primary">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {money(m.unit_price)} ETB · min {m.min_threshold}
                      </p>
                    </div>
                    <StatusPill tone={low ? "red" : "green"}>{m.on_hand}</StatusPill>
                  </div>
                </QueueItem>
              );
            })}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
