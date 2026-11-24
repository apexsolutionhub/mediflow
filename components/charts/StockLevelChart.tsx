"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartEmpty, CHART_COLORS } from "@/components/charts/chart-kit";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Medicine } from "@/lib/clinic";

const config: ChartConfig = {
  on_hand: { label: "On hand", color: CHART_COLORS[0] },
  min_threshold: { label: "Reorder at", color: CHART_COLORS[1] },
};

/** On-hand units vs reorder threshold for the medicines closest to running out. */
export function StockLevelChart({ medicines, limit = 8 }: { medicines: Medicine[]; limit?: number }) {
  const rows = useMemo(
    () =>
      medicines
        .filter((m) => m.is_active !== false)
        .map((m) => ({
          name: m.name.length > 20 ? `${m.name.slice(0, 19)}…` : m.name,
          on_hand: Number(m.on_hand),
          min_threshold: Number(m.min_threshold),
          ratio: Number(m.min_threshold) > 0 ? Number(m.on_hand) / Number(m.min_threshold) : 99,
        }))
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, limit),
    [medicines, limit],
  );
  if (!rows.length) return <ChartEmpty message="Add medicines to see stock levels." />;
  return (
    <div className="space-y-3">
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: rows.length * 46 + 16 }}
      >
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(30,58,138,0.06)" }} />
          <Bar dataKey="on_hand" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} barSize={13} />
          <Bar dataKey="min_threshold" fill={CHART_COLORS[1]} radius={[0, 6, 6, 0]} barSize={13} />
        </BarChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[0] }} />
          On hand
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[1] }} />
          Reorder at
        </li>
      </ul>
    </div>
  );
}
