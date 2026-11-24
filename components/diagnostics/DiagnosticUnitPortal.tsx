"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Beaker, ClipboardCheck, FileText, Filter, ScanLine, Send } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LabResultForm, isLabFormComplete } from "@/components/diagnostics/LabResultForm";
import { LabResultTable, resultValuesToHtml } from "@/components/diagnostics/LabResultTable";
import {
  emptyRadiologyDraft,
  isRadiologyDraftComplete,
  RadiologyReportForm,
  RadiologyReportView,
  radiologyReportToHtml,
  type RadiologyDraft,
} from "@/components/diagnostics/RadiologyReport";
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
import { type ClinicalOrder, formatStatus, orderTone } from "@/lib/clinic";
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
  const [radDraft, setRadDraft] = useState<Record<number, RadiologyDraft>>({});
  const [valueDraft, setValueDraft] = useState<Record<number, Record<string, string>>>({});
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
    const body = order.radiology_report
      ? radiologyReportToHtml(order.radiology_report, escapeHtml)
      : order.result_values?.length
      ? resultValuesToHtml(order.result_values, escapeHtml)
      : escapeHtml(order.result_text || resultDraft[order.id] || "—").replaceAll("\n", "<br/>");
    win.document.write(`<!doctype html><html><head><title>${meta.reportTitle}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#0f1c2e}
        .brand{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid #0d9488;padding-bottom:14px;margin-bottom:18px}
        .brand img{height:48px;width:auto}
        h1{font-size:20px;margin:0 0 8px;color:#0b2b63}
        .meta{color:#5b6b82;font-size:13px;margin-bottom:24px}
        .box{border:1px solid #d7e0ec;border-radius:14px;padding:16px;margin-top:16px}
        .label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#0d9488;font-weight:700}
      </style></head><body>
      <div class="brand"><img src="${window.location.origin}/assets/mediflow-logo.png" alt="MediFlow" /><span style="color:#5b6b82;font-size:12px">${new Date().toLocaleDateString()}</span></div>
      <h1>${meta.reportTitle}</h1>
      <div class="meta">${escapeHtml(order.encounter_number || "")} · ${escapeHtml(order.patient_name || "")}</div>
      <div class="box"><div class="label">Test</div><p><b>${escapeHtml(order.test_name || order.details || "")}</b>${order.test_name && order.details && order.details !== order.test_name ? "<br/>" + escapeHtml(order.details) : ""}</p></div>
      <div class="box"><div class="label">${meta.resultLabel}</div><p>${body}</p></div>
      <div class="box"><div class="label">Status</div><p>${escapeHtml(formatStatus(order.status))}</p></div>
      </body></html>`);
    win.document.close();
    // Print only once the logo has loaded, or it can come out blank.
    const logo = win.document.querySelector("img");
    const go = () => {
      win.focus();
      win.print();
    };
    if (logo && !logo.complete) {
      logo.onload = go;
      logo.onerror = go;
    } else {
      go();
    }
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

      <SectionCard
        kicker={tab === "active" ? "Work queue" : "History"}
        title={tab === "active" ? "Result entry" : "Reports sent to doctor"}
        description={
          tab === "active"
            ? "Start the order, write the result, then send it to the doctor results portal."
            : "Completed reports stay here for reprint. Doctors review them under Results."
        }
        action={
          <div className="flex flex-col items-stretch gap-1.5 sm:min-w-52">
            <span className="hidden text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:block sm:text-right">
              Show
            </span>
            <Combobox
              value={tab}
              onValueChange={(value) => setTab(value as "active" | "sent")}
              align="end"
              searchable={false}
              className="h-11 rounded-2xl px-3"
              contentClassName="min-w-52"
              renderValue={() => (
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                    {tab === "active" ? <ClipboardCheck className="size-3.5" /> : <Send className="size-3.5" />}
                  </span>
                  <span className="truncate font-medium text-primary">{tab === "active" ? "Enter results" : "Sent reports"}</span>
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/8 px-1.5 text-[11px] font-semibold text-primary tabular-nums">
                    {visible.length}
                  </span>
                </span>
              )}
              options={[
                {
                  value: "active",
                  label: "Enter results",
                  content: (
                    <span className="flex w-full items-center gap-2.5">
                      <ClipboardCheck className="size-3.5 text-primary" />
                      <span className="flex-1 font-medium">Enter results</span>
                      <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums">{active.length}</span>
                    </span>
                  ),
                },
                {
                  value: "sent",
                  label: "Sent reports",
                  content: (
                    <span className="flex w-full items-center gap-2.5">
                      <Send className="size-3.5 text-primary" />
                      <span className="flex-1 font-medium">Sent reports</span>
                      <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums">{sent.length}</span>
                    </span>
                  ),
                },
              ]}
            />
          </div>
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
              const params = order.test_parameters ?? [];
              const isRad = kind === "radiology";
              const structured = !isRad && params.length > 0;
              const rad = radDraft[order.id] ?? emptyRadiologyDraft();
              const ready = isRad
                ? isRadiologyDraftComplete(rad)
                : structured
                  ? isLabFormComplete(params, valueDraft[order.id])
                  : Boolean(draft.trim());
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
                      <p className="font-heading text-lg font-semibold text-cta">
                        {order.test_name || order.details}
                      </p>
                      {order.test_name && order.details && order.details !== order.test_name ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                          <span className="font-medium text-primary/70">Note: </span>
                          {order.details}
                        </p>
                      ) : null}
                    </div>
                    <StatusPill tone={orderTone(order.status)}>{formatStatus(order.status)}</StatusPill>
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
                      {isRad ? (
                        <RadiologyReportForm
                          draft={rad}
                          onChange={(next) => setRadDraft((prev) => ({ ...prev, [order.id]: next }))}
                        />
                      ) : structured ? (
                        <LabResultForm
                          params={params}
                          values={valueDraft[order.id] ?? {}}
                          onChange={(paramId, value) =>
                            setValueDraft((prev) => ({
                              ...prev,
                              [order.id]: { ...prev[order.id], [String(paramId)]: value },
                            }))
                          }
                        />
                      ) : (
                        <Textarea
                          className="min-h-28 rounded-2xl border-primary/12 bg-white shadow-sm"
                          placeholder={meta.resultPlaceholder}
                          value={draft}
                          onChange={(e) =>
                            setResultDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <LoadingButton
                          size="sm"
                          className={ctaButtonClass}
                          loading={busyOrderId === order.id && busyAction === "complete"}
                          loadingLabel="Sending…"
                          disabled={!ready}
                          onClick={async () => {
                            if (!ready) {
                              toast.error(
                                isRad
                                  ? "Findings, impression and overall result are required"
                                  : structured
                                    ? "Fill every result field"
                                    : "Enter a result before sending",
                              );
                              return;
                            }
                            setBusyOrderId(order.id);
                            setBusyAction("complete");
                            try {
                              await api.post(
                                `/clinic/orders/${order.id}/complete/`,
                                isRad
                                  ? rad
                                  : structured
                                    ? { values: valueDraft[order.id] ?? {} }
                                    : { result_text: draft.trim() },
                              );
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
                        {!isRad && !structured && draft.trim() ? (
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
                        {order.radiology_report ? (
                          <div className="mt-2">
                            <RadiologyReportView report={order.radiology_report} />
                          </div>
                        ) : order.result_values?.length ? (
                          <div className="mt-2">
                            <LabResultTable values={order.result_values} />
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary/90">
                            {order.result_text || "—"}
                          </p>
                        )}
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
