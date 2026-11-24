"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Banknote, ChevronRight, CreditCard, ExternalLink, Package, PackageX, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { MEDICINE_CATEGORIES, money, type Medicine, type MedicineDamage } from "@/lib/clinic";
import { isSplittable, looseName, looseUnitPrice, packName, stockText } from "@/lib/medicine-stock";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysLeft(value?: string | null) {
  if (!value) return null;
  const end = new Date(`${value.slice(0, 10)}T23:59:59`).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function expiryNote(days: number | null) {
  if (days === null) return "";
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "expires today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function Tile({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-white px-2 py-2 text-center">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums text-primary", tone)}>{value}</p>
    </div>
  );
}

/**
 * Wraps a medicine's name block. Hovering (or focusing) it shows a quick summary card with an
 * "Open full detail" button; clicking it, or that button, opens the full detail in a sheet.
 */
export function MedicineLineDetail({
  medicine: m,
  children,
  className,
}: {
  medicine: Medicine;
  children: ReactNode;
  className?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [damages, setDamages] = useState<MedicineDamage[] | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    let cancelled = false;
    api
      .get("/clinic/medicine-damages/", { params: { medicine: m.id, page_size: 50 } })
      .then(({ data }) => !cancelled && setDamages(results<MedicineDamage>(data)))
      .catch(() => !cancelled && setDamages([]));
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, m.id]);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    if (sheetOpen) return;
    clearTimers();
    openTimer.current = setTimeout(() => setPreviewOpen(true), 200);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setPreviewOpen(false), 180);
  };
  const openSheet = () => {
    clearTimers();
    setPreviewOpen(false);
    setSheetOpen(true);
  };

  const split = isSplittable(m);
  const credit = Number(m.credit_amount ?? 0);
  const total = Number(m.total_cost ?? 0);
  const paid = Number(m.paid_amount ?? 0);
  const days = daysLeft(m.expiry_date);
  const expiryTone = days === null ? "" : days < 0 ? "text-rose-600" : days <= 30 ? "text-amber-700" : "text-emerald-700";
  const category = MEDICINE_CATEGORIES.find((c) => c.value === m.category)?.label ?? "Uncategorized";
  const margin = Number(m.unit_price) - Number(m.cost ?? 0);

  return (
    <>
      <Popover open={previewOpen && !sheetOpen} onOpenChange={(next) => !next && setPreviewOpen(false)}>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Details for ${m.name}`}
            className={cn(
              "group/trigger -m-1.5 cursor-pointer rounded-xl border border-transparent p-1.5 text-left transition hover:border-(--role)/35 hover:bg-(--role)/6 focus-visible:border-(--role)/50 focus-visible:outline-none",
              className,
            )}
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
            onFocus={scheduleOpen}
            onBlur={scheduleClose}
            onClick={openSheet}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openSheet();
              }
            }}
          >
            {children}
            <ChevronRight className="mt-1 ml-auto size-4 shrink-0 text-(--role) opacity-0 transition group-hover/trigger:translate-x-0.5 group-hover/trigger:opacity-100" />
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[min(22rem,calc(100vw-2rem))] gap-0 rounded-2xl p-4"
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-primary/10 pb-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-primary">{m.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Batch {m.batch_number || "—"} · {m.supplier_name || "No supplier"}
                </p>
              </div>
              {credit > 0.005 ? (
                <StatusPill tone="orange">{money(credit)} owed</StatusPill>
              ) : (
                <StatusPill tone="green">Paid</StatusPill>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2">
              <Tile label="In stock" value={m.stock_text || stockText(m)} />
              <Tile label="Price" value={money(m.unit_price)} />
              <Tile
                label="Expiry"
                value={m.expiry_date ? (days !== null && days < 0 ? "Expired" : `${days}d`) : "—"}
                tone={expiryTone}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Paid {money(paid)} of {money(total)} ETB
            </p>
            <Button type="button" size="sm" variant="outline" className="w-full gap-1.5 rounded-xl" onClick={openSheet}>
              <ExternalLink className="size-3.5" />
              Open full detail
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex h-full w-[min(100%,34rem)] flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-1.5 border-b border-primary/10 px-5 py-4 pr-12 text-left">
            <div className="flex items-center gap-3">
              {m.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image_url} alt={m.name} className="size-12 shrink-0 rounded-xl border object-cover" />
              ) : (
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                  <Package className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <SheetTitle className="truncate font-heading text-lg">{m.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  Batch {m.batch_number || "—"} · {category}
                </SheetDescription>
              </div>
            </div>
            {m.description ? <p className="pt-1 text-sm leading-6 text-muted-foreground">{m.description}</p> : null}
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <section className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
                <Package className="size-4" /> Stock
              </p>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
                <Tile label="On hand" value={m.stock_text || stockText(m)} />
                <Tile label="Received" value={m.received_quantity ?? "—"} />
                <Tile label="Low alert at" value={`${m.min_threshold} ${packName(m)}s`} />
                <Tile label="Sold as" value={split ? `${packName(m)} / ${looseName(m)}` : `${packName(m)} only`} />
              </div>
            </section>

            <section className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-rose-700 uppercase">
                  <CreditCard className="size-4" /> Payment
                </p>
                {credit > 0.005 ? <StatusPill tone="orange">On credit</StatusPill> : <StatusPill tone="green">Fully paid</StatusPill>}
              </div>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
                <Tile label="Total cost" value={money(total)} />
                <Tile label="Paid" value={money(paid)} tone="text-emerald-700" />
                <Tile label="Due" value={money(credit)} tone={credit > 0.005 ? "text-rose-600" : undefined} />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${total ? Math.min(100, (paid / total) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.received_quantity ?? 0} {packName(m)}s received × {money(m.cost ?? 0)} ETB cost
              </p>
            </section>

            <section className="rounded-2xl border border-primary/10 p-4">
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
                <Banknote className="size-4" /> Pricing
              </p>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Price per {packName(m)}</dt>
                  <dd className="font-bold tabular-nums">{money(m.unit_price)} ETB</dd>
                </div>
                {split ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Price per {looseName(m)}</dt>
                    <dd className="font-bold tabular-nums">{money(looseUnitPrice(m))} ETB</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cost per {packName(m)}</dt>
                  <dd className="tabular-nums">{money(m.cost ?? 0)} ETB</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Margin per {packName(m)}</dt>
                  <dd className="font-bold text-emerald-700 tabular-nums">{money(margin)} ETB</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-primary/10 p-4">
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
                <Truck className="size-4" /> Supplier & expiry
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-bold">{m.supplier_name || "No supplier"}</p>
                <p className="text-xs text-muted-foreground">{m.supplier_phone || "No phone"}</p>
                <p className="text-xs text-muted-foreground">{m.supplier_email || "No email"}</p>
                <p className={cn("pt-1 text-sm font-semibold", expiryTone)}>
                  {m.expiry_date ? `${formatDate(m.expiry_date)} · ${expiryNote(days)}` : "No expiry date"}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4">
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-amber-700 uppercase">
                <PackageX className="size-4" /> Damaged stock ({damages?.length ?? "…"})
              </p>
              {damages === null ? (
                <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
              ) : damages.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nothing written off for this line.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {damages.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-primary/10 bg-white px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{formatDate(d.created_at)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.reason || "No reason given"}</span>
                      <span className="font-bold text-amber-800 tabular-nums">{d.quantity_text}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
