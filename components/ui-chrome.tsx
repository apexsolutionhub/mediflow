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
  "h-11 rounded-xl bg-linear-to-r from-cta to-apex-orange-light font-semibold text-cta-foreground shadow-md shadow-cta/30 hover:from-cta/95 hover:to-apex-orange-light/95";

type StatusTone = "navy" | "orange" | "green" | "muted" | "red";

const statusToneClass: Record<StatusTone, string> = {
  navy: "border-primary/35 bg-primary/15 text-primary hover:bg-primary/15",
  orange: "border-cta/40 bg-cta/18 text-amber-900 hover:bg-cta/18",
  green: "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  muted: "border-border bg-muted text-foreground/80 hover:bg-muted",
  red: "border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-100",
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
        "h-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        statusToneClass[tone],
      )}
    >
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
    <Empty className="rounded-3xl border-2 border-dashed border-primary/25 bg-secondary/40 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl bg-linear-to-br from-cta/30 to-primary/15 text-primary ring-1 ring-primary/25"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle className="font-heading text-base font-semibold text-primary">
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

const statToneClass: Record<StatTone, string> = {
  navy: "from-[#e8eef8] to-white border-primary/30 text-primary shadow-primary/10",
  orange: "from-[#fff1d6] to-white border-cta/40 text-amber-900 shadow-amber-200/60",
  green: "from-[#d9f5e8] to-white border-emerald-300/90 text-emerald-800 shadow-emerald-200/50",
  rose: "from-[#ffe4e8] to-white border-rose-300/90 text-rose-800 shadow-rose-200/50",
};

export function StatTile({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
}) {
  return (
    <Card
      className={cn(
        "clinic-panel gap-0 rounded-3xl border-2 bg-linear-to-br py-0 shadow-md",
        statToneClass[tone],
      )}
    >
      <CardContent className="p-4">
        <p className="text-xs font-semibold tracking-wide text-foreground/65">{label}</p>
        <p className="mt-1 font-heading text-3xl font-bold tracking-tight">{value}</p>
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
        "clinic-panel clinic-panel-glow gap-0 overflow-hidden rounded-3xl border-2 py-0 shadow-md",
        className,
      )}
    >
      <CardHeader className="border-b-2 border-primary/15 bg-linear-to-r from-primary/10 via-white to-cta/10 px-5 py-4">
        {kicker ? <p className="clinic-kicker">{kicker}</p> : null}
        <CardTitle className="font-heading text-xl font-bold text-primary">{title}</CardTitle>
        {description ? (
          <CardDescription className="max-w-2xl text-[13px] leading-6 text-foreground/70">
            {description}
          </CardDescription>
        ) : null}
        {action ? <CardAction>{action}</CardAction> : null}
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
        "gap-0 rounded-2xl border-2 border-primary/20 bg-white py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cta/45 hover:shadow-lg hover:shadow-primary/10",
        className,
      )}
    >
      <CardContent className="px-5 py-5">{children}</CardContent>
    </Card>
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
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-[0.16em] text-cta uppercase">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator className="bg-primary/20" />
      <div className="grid gap-3 pt-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}
