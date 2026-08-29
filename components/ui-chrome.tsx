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
  "h-11 rounded-xl bg-linear-to-r from-cta to-apex-orange-light font-semibold text-cta-foreground shadow-md shadow-cta/25 hover:from-cta/95 hover:to-apex-orange-light/95";

type StatusTone = "navy" | "orange" | "green" | "muted" | "red";

const statusToneClass: Record<StatusTone, string> = {
  navy: "border-primary/15 bg-primary/10 text-primary hover:bg-primary/10",
  orange: "border-cta/25 bg-cta/12 text-amber-800 hover:bg-cta/12",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  muted: "border-border bg-muted text-muted-foreground hover:bg-muted",
  red: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50",
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
    <Empty className="clinic-panel rounded-3xl border border-dashed border-primary/15 bg-muted/20 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl bg-linear-to-br from-cta/20 to-primary/10 text-primary ring-1 ring-cta/20"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle className="font-heading text-base font-semibold text-primary">
          {title}
        </EmptyTitle>
        <EmptyDescription className="max-w-sm leading-6">{hint}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type StatTone = "navy" | "orange" | "green" | "rose";

const statToneClass: Record<StatTone, string> = {
  navy: "from-white to-primary/5 border-primary/10 text-primary shadow-primary/5",
  orange: "from-amber-50 to-white border-cta/20 text-cta shadow-amber-100/70",
  green: "from-emerald-50 to-white border-emerald-200/80 text-emerald-700 shadow-emerald-100/70",
  rose: "from-rose-50 to-white border-rose-200/80 text-rose-700 shadow-rose-100/70",
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
        "clinic-panel gap-0 rounded-3xl border bg-linear-to-br py-0 shadow-md",
        statToneClass[tone],
      )}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">{value}</p>
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
        "clinic-panel clinic-panel-glow gap-0 overflow-hidden rounded-3xl py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="border-b border-primary/8 bg-linear-to-r from-primary/4 via-transparent to-cta/5 px-5 py-4">
        {kicker ? <p className="clinic-kicker">{kicker}</p> : null}
        <CardTitle className="font-heading text-xl font-semibold text-primary">{title}</CardTitle>
        {description ? (
          <CardDescription className="max-w-2xl leading-6">{description}</CardDescription>
        ) : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
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
        "gap-0 rounded-2xl border-primary/10 bg-card/95 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cta/25 hover:shadow-lg hover:shadow-primary/5",
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
        <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator className="bg-primary/8" />
      <div className="grid gap-3 pt-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}
