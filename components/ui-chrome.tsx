import { cn } from "@/lib/utils";

/** Primary action button — amber gradient with readable dark text. */
export const ctaButtonClass =
  "h-11 rounded-xl bg-linear-to-r from-cta to-apex-orange-light font-semibold text-cta-foreground shadow-md shadow-cta/25 hover:from-cta/95 hover:to-apex-orange-light/95";

export function StatusPill({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "orange" | "green" | "muted" | "red";
}) {
  const tones = {
    navy: "bg-primary/10 text-primary ring-primary/15",
    orange: "bg-cta/12 text-amber-800 ring-cta/25",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    muted: "bg-slate-100 text-slate-600 ring-slate-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="clinic-panel flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/15 px-6 py-14 text-center">
      <div className="mb-3 size-10 rounded-2xl bg-linear-to-br from-cta/20 to-primary/10 ring-1 ring-cta/20" />
      <p className="font-heading text-base font-semibold text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{hint}</p>
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "navy" | "orange" | "green" | "rose";
}) {
  const tones = {
    navy: "from-white to-primary/5 border-primary/10 text-primary shadow-primary/5",
    orange: "from-amber-50 to-white border-cta/20 text-cta shadow-amber-100/70",
    green: "from-emerald-50 to-white border-emerald-200/80 text-emerald-700 shadow-emerald-100/70",
    rose: "from-rose-50 to-white border-rose-200/80 text-rose-700 shadow-rose-100/70",
  };
  return (
    <div
      className={cn(
        "clinic-panel rounded-3xl border bg-linear-to-br p-4 shadow-md",
        tones[tone],
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">{value}</p>
    </div>
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
    <section
      id={id}
      className={cn("clinic-panel clinic-panel-glow overflow-hidden rounded-3xl", className)}
    >
      <div className="border-b border-primary/8 bg-linear-to-r from-primary/4 via-transparent to-cta/5 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {kicker ? <p className="clinic-kicker">{kicker}</p> : null}
            <h2 className="font-heading text-xl font-semibold text-primary">{title}</h2>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
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
    <div
      className={cn(
        "rounded-3xl border border-primary/10 bg-white/95 px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cta/25 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
