import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  Inbox,
  Pill,
  Receipt,
  ScanLine,
  Share2,
  Stethoscope,
  Tags,
  TrendingUp,
  Undo2,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** Primary action button — amber gradient with readable dark text. */
export const ctaButtonClass =
  "h-11 rounded-xl bg-linear-to-r from-cta to-apex-orange-light font-semibold text-cta-foreground shadow-md shadow-cta/30 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-cta/40 hover:brightness-105 active:translate-y-0";

type StatusTone = "navy" | "orange" | "green" | "muted" | "red";

const statusToneClass: Record<StatusTone, string> = {
  navy: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50 [--dot:#2563eb]",
  orange: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50 [--dot:#f59e0b]",
  green: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 [--dot:#10b981]",
  muted: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 [--dot:#94a3b8]",
  red: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-50 [--dot:#e11d48]",
};

export function StatusPill({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        statusToneClass[tone],
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-(--dot)" />
      {children}
    </Badge>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <Empty className="rounded-2xl border border-dashed border-(--role)/35 bg-linear-to-b from-white to-(--role)/5 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-lg shadow-(--role)/30 ring-4 ring-(--role)/15 [&_svg]:size-6"
        >
          {icon ?? <Inbox />}
        </EmptyMedia>
        <EmptyTitle className="mt-1 font-heading text-base font-semibold text-primary">
          {title}
        </EmptyTitle>
        <EmptyDescription className="max-w-sm leading-6 text-muted-foreground">
          {hint}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type StatTone = "navy" | "orange" | "green" | "rose";

const statTone: Record<
  StatTone,
  { card: string; chip: string; value: string; orb: string }
> = {
  navy: {
    card: "from-blue-50 via-white to-white border-blue-200/70",
    chip: "from-blue-500 to-indigo-600 shadow-blue-500/35",
    value: "text-blue-950",
    orb: "bg-blue-400/15",
  },
  orange: {
    card: "from-amber-50 via-white to-white border-amber-200/80",
    chip: "from-amber-400 to-orange-500 shadow-amber-500/35",
    value: "text-amber-950",
    orb: "bg-amber-400/20",
  },
  green: {
    card: "from-emerald-50 via-white to-white border-emerald-200/80",
    chip: "from-emerald-400 to-teal-600 shadow-emerald-500/35",
    value: "text-emerald-950",
    orb: "bg-emerald-400/20",
  },
  rose: {
    card: "from-rose-50 via-white to-white border-rose-200/80",
    chip: "from-rose-400 to-pink-600 shadow-rose-500/35",
    value: "text-rose-950",
    orb: "bg-rose-400/20",
  },
};

/** Picks a sensible icon from the label so every tile gets one without extra wiring. */
function iconForLabel(label: string, tone: StatTone, className: string): React.ReactElement {
  const l = label.toLowerCase();
  if (/\blow\b|\balerts?\b|\bissues?\b|attention|expired/.test(l)) return <AlertTriangle className={className} />;
  if (/pending|waiting|\bdue\b/.test(l)) return <Clock className={className} />;
  if (/refund/.test(l)) return <Undo2 className={className} />;
  if (/avg|average|trend/.test(l)) return <TrendingUp className={className} />;
  if (/\bpayments?\b|receipt/.test(l)) return <Receipt className={className} />;
  if (/revenue|\bpaid\b|\bcash\b|\betb\b|\bfees?\b/.test(l)) return <Wallet className={className} />;
  if (/encounter/.test(l)) return <Stethoscope className={className} />;
  if (/visit|patient|\busers?\b|\bstaff\b|arrival/.test(l)) return <Users className={className} />;
  if (/\blab\b|blood/.test(l)) return <FlaskConical className={className} />;
  if (/radiolog|imaging|x-ray/.test(l)) return <ScanLine className={className} />;
  if (/\brx\b|pharmac|medicine|\bskus?\b|\bstock\b|prescription/.test(l)) return <Pill className={className} />;
  if (/ticket|equipment/.test(l)) return <Wrench className={className} />;
  if (/billable|service|catalog|line/.test(l)) return <Tags className={className} />;
  if (/department|branch/.test(l)) return <Building2 className={className} />;
  if (/referral/.test(l)) return <Share2 className={className} />;
  if (/\broles?\b|\bslots?\b|\bopen\b/.test(l)) return <UserCheck className={className} />;
  switch (tone) {
    case "orange":
      return <Clock className={className} />;
    case "green":
      return <CheckCircle2 className={className} />;
    case "rose":
      return <AlertTriangle className={className} />;
    default:
      return <Activity className={className} />;
  }
}

export function StatTile({
  label,
  value,
  tone = "navy",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
  icon?: LucideIcon;
}) {
  const t = statTone[tone];
  const iconNode = icon
    ? React.createElement(icon, { className: "size-5.5" })
    : iconForLabel(label, tone, "size-5.5");
  return (
    <Card
      className={cn(
        "group/stat @container/stat relative gap-0 overflow-hidden rounded-2xl border bg-linear-to-br py-0 shadow-sm shadow-slate-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10",
        t.card,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 size-28 rounded-full transition-transform duration-500 group-hover/stat:scale-125",
          t.orb,
        )}
      />
      <CardContent className="relative flex flex-col items-start gap-2 p-3.5 sm:p-4 @[13rem]/stat:flex-row @[13rem]/stat:items-center @[13rem]/stat:gap-3.5">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg sm:size-12 sm:rounded-2xl",
            t.chip,
          )}
        >
          {iconNode}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] leading-tight font-semibold tracking-[0.08em] break-normal text-foreground/60 uppercase">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 font-heading leading-tight font-bold tracking-tight tabular-nums",
              // Words ("All history") read better smaller than figures ("12,300 ETB").
              typeof value === "string" && !/^[\d.,\s-]/.test(value)
                ? "text-xl"
                : "text-[1.65rem]",
              t.value,
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  kicker,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  id,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}) {
  return (
    <Card
      id={id}
      className={cn(
        "clinic-panel clinic-panel-glow flex w-full flex-col gap-0 overflow-hidden rounded-2xl py-0",
        className,
      )}
    >
      <div aria-hidden className="clinic-accent-bar h-1 w-full shrink-0" />
      <CardHeader className="clinic-band shrink-0 gap-1.5 border-b border-(--role)/15 px-5 py-4 has-data-[slot=card-action]:grid-cols-1 @xl/card-header:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        {kicker ? <p className="clinic-kicker">{kicker}</p> : null}
        <CardTitle className="font-heading text-xl font-bold text-primary">{title}</CardTitle>
        {description ? (
          <CardDescription className="max-w-2xl text-[13px] leading-6 text-foreground/70">
            {description}
          </CardDescription>
        ) : null}
        {action ? (
          <CardAction className="col-start-1 row-span-1 row-start-auto mt-1.5 justify-self-start @xl/card-header:col-start-2 @xl/card-header:row-span-2 @xl/card-header:row-start-1 @xl/card-header:mt-0 @xl/card-header:justify-self-end">
            {action}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn("bg-white p-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function QueueItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "gap-0 rounded-xl border border-l-4 border-slate-200 border-l-(--role) bg-white py-0 shadow-sm shadow-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-(--role)/40 hover:border-l-(--role) hover:shadow-lg hover:shadow-(--role)/10",
        className,
      )}
    >
      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}

/** Lists stay full-height until this many items, then become an inner scroll region. */
export const CATALOG_SCROLL_THRESHOLD = 10;

export function catalogScrollClassName(
  itemCount: number,
  {
    threshold = CATALOG_SCROLL_THRESHOLD,
    maxHeightClass = "max-h-[min(60vh,36rem)]",
    className,
  }: {
    threshold?: number;
    maxHeightClass?: string;
    className?: string;
  } = {},
) {
  if (itemCount <= threshold) return className;
  return cn(
    maxHeightClass,
    // `relative` keeps absolutely-positioned children (e.g. sr-only labels) clipped inside
    // the list instead of stretching the whole page's scroll height.
    "relative overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]",
    className,
  );
}

/** Catalog / queue lists: no nested scroll until there are more than `threshold` items. */
export function ScrollableCatalog({
  itemCount,
  threshold = CATALOG_SCROLL_THRESHOLD,
  maxHeightClass,
  className,
  children,
}: {
  itemCount: number;
  threshold?: number;
  maxHeightClass?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={catalogScrollClassName(itemCount, {
        threshold,
        maxHeightClass,
        className,
      })}
    >
      {children}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-[0.16em] text-(--role-ink) uppercase">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator className="bg-primary/20" />
      <div className="grid w-full gap-3 pt-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}
