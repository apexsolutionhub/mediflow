"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Beaker, ClipboardCheck, FileText, ScanLine, Send } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicalOrder, orderTone } from "@/lib/clinic";
import { cn } from "@/lib/utils";

type UnitKind = "lab" | "radiology";

const META: Record<
  UnitKind,
  {
    title: string;
    subtitle: string;
    queueParam: string;
    icon: typeof Beaker;
    orderLabel: string;
    startLabel: string;
    startToast: string;
    resultPlaceholder: string;
    resultLabel: string;
    reportTitle: string;
    emptyHint: string;
  }
> = {
  lab: {
    title: "Lab results portal",
    subtitle: "Start approved tests, enter results, and send them to the doctor inbox.",
    queueParam: "lab",
    icon: Beaker,
    orderLabel: "lab",
    startLabel: "Collect / start",
    startToast: "Sample / test started",
    resultPlaceholder: "Enter lab findings, values, and notes…",
    resultLabel: "Lab result",
    reportTitle: "Lab report",
    emptyHint: "Lab orders appear here after reception payment approval.",
  },
  radiology: {
    title: "Radiology results portal",
    subtitle: "Start approved imaging, enter findings, and send reports to the doctor.",
    queueParam: "radiology",
    icon: ScanLine,
    orderLabel: "radiology",
    startLabel: "Start imaging",
    startToast: "Imaging started",
    resultPlaceholder: "Enter imaging findings and impression…",
    resultLabel: "Findings",
    reportTitle: "Radiology report",
    emptyHint: "Imaging orders appear here after reception payment approval.",
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function DiagnosticUnitPortal({ kind }: { kind: UnitKind }) {
  const meta = META[kind];
  const Icon = meta.icon;
  const [orders, setOrders] = useState<ClinicalOrder[]>([]);
  const [resultDraft, setResultDraft] = useState<Record<number, string>>({});
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<"start" | "complete" | null>(null);
  const [tab, setTab] = useState<"active" | "sent">("active");

  const load = useCallback(async () => {
    const response = await api.get("/clinic/orders/", {
      params: { queue: meta.queueParam, page_size: 100 },
    });
    setOrders(results<ClinicalOrder>(response.data));
  }, [meta.queueParam]);

  useEffect(() => {
    load().catch(() =>
      toast.error(`Could not load ${meta.orderLabel} queue`, { id: `${kind}-queue` }),
    );
  }, [kind, load, meta.orderLabel]);

  const active = useMemo(
    () => orders.filter((o) => o.status === "PaymentApproved" || o.status === "InProgress"),
    [orders],
  );
  const sent = useMemo(
    () => orders.filter((o) => o.status === "Completed" || o.status === "Reviewed"),
    [orders],
  );
  const visible = tab === "active" ? active : sent;

  const printReport = (order: ClinicalOrder) => {
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) {
      toast.error("Allow pop-ups to print");
      return;
    }
    const body = escapeHtml(order.result_text || resultDraft[order.id] || "—").replaceAll(
      "\n",
      "<br/>",
    );
    win.document.write(`<!doctype html><html><head><title>${meta.reportTitle}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#0f1c2e}
        h1{font-size:20px;margin:0 0 8px;color:#12305f}
        .meta{color:#5b6b82;font-size:13px;margin-bottom:24px}
        .box{border:1px solid #d7e0ec;border-radius:14px;padding:16px;margin-top:16px}
        .label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#e8951e;font-weight:700}
      </style></head><body>
      <h1>MediFlow · ${meta.reportTitle}</h1>
      <div class="meta">${escapeHtml(order.encounter_number || "")} · ${escapeHtml(order.patient_name || "")} · ${new Date().toLocaleString()}</div>
      <div class="box"><div class="label">Order</div><p>${escapeHtml(order.details || "")}</p></div>
      <div class="box"><div class="label">${meta.resultLabel}</div><p>${body}</p></div>
      <div class="box"><div class="label">Status</div><p>${escapeHtml(order.status)}</p></div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <ClinicShell title={meta.title} subtitle={meta.subtitle}>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatTile label="Ready to start" value={active.filter((o) => o.status === "PaymentApproved").length} tone="navy" />
        <StatTile
          label="In progress"
          value={active.filter((o) => o.status === "InProgress").length}
          tone="orange"
        />
        <StatTile label="Sent to doctor" value={sent.length} tone="green" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "active" ? "default" : "outline"}
          className={cn(
            "rounded-xl",
            tab === "active" && "bg-primary text-primary-foreground",
          )}
          onClick={() => setTab("active")}
        >
          <ClipboardCheck className="size-3.5" />
          Enter results
          <span className="ml-1 rounded-full bg-white/15 px-1.5 text-[11px]">{active.length}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "sent" ? "default" : "outline"}
          className={cn(
            "rounded-xl",
            tab === "sent" && "bg-primary text-primary-foreground",
          )}
          onClick={() => setTab("sent")}
        >
          <Send className="size-3.5" />
          Sent reports
          <span className="ml-1 rounded-full bg-white/15 px-1.5 text-[11px]">{sent.length}</span>
        </Button>
      </div>

      <SectionCard
        kicker={tab === "active" ? "Work queue" : "History"}
        title={tab === "active" ? "Result entry" : "Reports sent to doctor"}
        description={
          tab === "active"
            ? "Start the order, write the result, then send it to the doctor results portal."
            : "Completed reports stay here for reprint. Doctors review them under Results."
        }
        action={
          <StatusPill tone={tab === "active" ? "navy" : "green"}>
            {visible.length} {tab === "active" ? "open" : "sent"}
          </StatusPill>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            title={tab === "active" ? "Queue clear" : "No sent reports yet"}
            hint={
              tab === "active"
                ? meta.emptyHint
                : "Complete an order above to send the first report."
            }
            icon={<Icon className="size-5" />}
          />
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const draft = resultDraft[order.id] ?? order.result_text ?? "";
              const canEnter =
                order.status === "PaymentApproved" || order.status === "InProgress";
              return (
                <QueueItem key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary">
                          <Icon className="size-3.5" />
                          {meta.orderLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.encounter_number}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-primary">
                        {order.patient_name}
                      </p>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {order.details}
                      </p>
                    </div>
                    <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                  </div>

                  {canEnter ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-primary/10 bg-linear-to-br from-slate-50/80 to-white p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary/70 uppercase">
                          {meta.resultLabel}
                        </p>
                        {order.status === "PaymentApproved" ? (
                          <LoadingButton
                            size="sm"
                            className="shadow-sm"
                            loading={busyOrderId === order.id && busyAction === "start"}
                            loadingLabel="Starting…"
                            onClick={async () => {
                              setBusyOrderId(order.id);
                              setBusyAction("start");
                              try {
                                await api.post(`/clinic/orders/${order.id}/start/`);
                                toast.success(meta.startToast);
                                await load();
                              } finally {
                                setBusyOrderId(null);
                                setBusyAction(null);
                              }
                            }}
                          >
                            {meta.startLabel}
                          </LoadingButton>
                        ) : null}
                      </div>
                      <Textarea
                        className="min-h-28 rounded-2xl border-primary/12 bg-white shadow-sm"
                        placeholder={meta.resultPlaceholder}
                        value={draft}
                        onChange={(e) =>
                          setResultDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <LoadingButton
                          size="sm"
                          className={ctaButtonClass}
                          loading={busyOrderId === order.id && busyAction === "complete"}
                          loadingLabel="Sending…"
                          disabled={!draft.trim()}
                          onClick={async () => {
                            if (!draft.trim()) {
                              toast.error("Enter a result before sending");
                              return;
                            }
                            setBusyOrderId(order.id);
                            setBusyAction("complete");
                            try {
                              await api.post(`/clinic/orders/${order.id}/complete/`, {
                                result_text: draft.trim(),
                              });
                              toast.success("Result sent to doctor");
                              setTab("sent");
                              await load();
                            } finally {
                              setBusyOrderId(null);
                              setBusyAction(null);
                            }
                          }}
                        >
                          <Send className="size-3.5" />
                          Complete & send to doctor
                        </LoadingButton>
                        {draft.trim() ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:bg-primary/5"
                            onClick={() => printReport(order)}
                          >
                            <FileText className="size-4" />
                            Print draft
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-4 py-3">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-emerald-800/80 uppercase">
                          {meta.resultLabel}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary/90">
                          {order.result_text || "—"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => printReport(order)}
                      >
                        <FileText className="size-4" />
                        Print report
                      </Button>
                    </div>
                  )}
                </QueueItem>
              );
            })}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
