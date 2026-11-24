"use client";

import { BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/** Brand-aligned palette (navy, amber, emerald, rose, sky, violet). */
export const CHART_COLORS = [
  "#1e3a8a",
  "#e8951e",
  "#10b981",
  "#e11d48",
  "#38bdf8",
  "#7c3aed",
];

export type SeriesPoint = { key: string; label: string; value: number };

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Turns sparse per-day rows into a continuous series for [start, end].
 * Ranges longer than 62 days are summed per month so charts stay readable.
 */
export function buildSeries(
  start: string,
  end: string,
  rows: { date: string; value: number }[],
): SeriesPoint[] {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return [];
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const monthly = days > 62;
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = monthly ? row.date.slice(0, 7) : row.date;
    totals.set(key, (totals.get(key) ?? 0) + row.value);
  }
  const out: SeriesPoint[] = [];
  if (monthly) {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
      out.push({
        key,
        label: `${MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`,
        value: totals.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = toKey(cursor);
      out.push({
        key,
        label: `${MONTHS[cursor.getMonth()]} ${cursor.getDate()}`,
        value: totals.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return out;
}

export function ChartEmpty({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-44 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-(--role)/35 bg-linear-to-b from-white to-(--role)/5 px-4 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/30">
        <BarChart3 className="size-5" />
      </span>
      {message}
    </div>
  );
}

type Formatter = (value: number) => string;
const plain: Formatter = (v) => v.toLocaleString();

function TooltipRow({
  name,
  value,
  color,
  format,
}: {
  name: string;
  value: number;
  color?: string;
  format: Formatter;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color ?? "currentColor" }} />
        {name}
      </span>
      <span className="font-mono font-medium text-foreground tabular-nums">{format(value)}</span>
    </div>
  );
}

function tooltipFormatter(format: Formatter) {
  return function renderTooltipRow(
    value: unknown,
    name: unknown,
    item: { color?: string } | undefined,
  ) {
    return (
      <TooltipRow name={String(name)} value={Number(value)} color={item?.color} format={format} />
    );
  };
}

/** Time series: smooth area (best for volume) or bars (best for sparse money data). */
export function TrendChart({
  data,
  label,
  color = CHART_COLORS[0],
  kind = "area",
  format = plain,
  height = 240,
}: {
  data: SeriesPoint[];
  label: string;
  color?: string;
  kind?: "area" | "bar";
  format?: Formatter;
  height?: number;
}) {
  const config: ChartConfig = { value: { label, color } };
  const gradientId = `grad-${label.replace(/\W/g, "")}`;
  const tickEvery = Math.max(0, Math.ceil(data.length / 7) - 1);
  const axis = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        interval={tickEvery}
        minTickGap={12}
      />
      <YAxis
        width={44}
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
        tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
      />
      <ChartTooltip
        cursor={{ strokeOpacity: 0.25 }}
        content={<ChartTooltipContent formatter={tooltipFormatter(format)} />}
      />
    </>
  );
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      {kind === "bar" ? (
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          {axis}
          <Bar dataKey="value" name={label} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {axis}
          <Area
            dataKey="value"
            name={label}
            type="monotone"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={data.length <= 31}
          />
        </AreaChart>
      )}
    </ChartContainer>
  );
}

export type Slice = { name: string; value: number };

/** Donut with a centre total and a legend that lists each slice's share. */
export function DonutChart({
  data,
  format = plain,
  centerLabel = "Total",
  height = 200,
}: {
  data: Slice[];
  format?: Formatter;
  centerLabel?: string;
  height?: number;
}) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((sum, d) => sum + d.value, 0);
  if (!rows.length) return <ChartEmpty message="No data in this period." />;
  const config: ChartConfig = Object.fromEntries(
    rows.map((r, i) => [r.name, { label: r.name, color: CHART_COLORS[i % CHART_COLORS.length] }]),
  );
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative w-full max-w-52 shrink-0" style={{ height }}>
        <ChartContainer config={config} className="aspect-auto size-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={tooltipFormatter(format)} />} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={rows.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {rows.map((r, i) => (
                <Cell key={r.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-lg leading-tight font-bold text-primary tabular-nums">
            {format(total)}
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {format(r.value)}
              <span className="ml-1.5 text-[11px]">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars (top services, stock levels...). */
export function HBarChart({
  data,
  label,
  color = CHART_COLORS[0],
  format = plain,
  rowHeight = 34,
  labelWidth = 120,
}: {
  data: Slice[];
  label: string;
  color?: string;
  format?: Formatter;
  rowHeight?: number;
  labelWidth?: number;
}) {
  if (!data.length) return <ChartEmpty message="No data in this period." />;
  const config: ChartConfig = { value: { label, color } };
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: data.length * rowHeight + 16 }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
        />
        <ChartTooltip
          cursor={{ fill: "rgba(30,58,138,0.06)" }}
          content={<ChartTooltipContent formatter={tooltipFormatter(format)} />}
        />
        <Bar dataKey="value" name={label} fill={color} radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

/** Stacked columns: one column per category, one stack segment per series. */
export function StackedBars({
  rows,
  series,
  height = 240,
}: {
  rows: Record<string, string | number>[];
  series: string[];
  height?: number;
}) {
  if (!rows.length) return <ChartEmpty message="No orders in this period." />;
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s, { label: s, color: CHART_COLORS[i % CHART_COLORS.length] }]),
  );
  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={i === series.length - 1 ? [6, 6, 0, 0] : 0}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {series.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
