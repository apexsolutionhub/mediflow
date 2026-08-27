"use client";

import { useCallback, useEffect, useState } from "react";
import { Beaker, FileText } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicalOrder, orderTone } from "@/lib/clinic";

export default function LabQueuePage() {
  const [queue, setQueue] = useState<ClinicalOrder[]>([]);
  const [resultDraft, setResultDraft] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const orders = await api.get("/clinic/orders/", {
      params: { queue: "lab", page_size: 100 },
    });
    setQueue(results<ClinicalOrder>(orders.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load lab queue", { id: "lab-queue" }));
  }, [load]);

  const printReport = (order: ClinicalOrder) => {
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) {
      toast.error("Allow pop-ups to print");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Lab report</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#0f1c2e}
        h1{font-size:20px;margin:0 0 8px;color:#12305f}
        .meta{color:#5b6b82;font-size:13px;margin-bottom:24px}
        .box{border:1px solid #d7e0ec;border-radius:14px;padding:16px;margin-top:16px}
        .label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#e8951e;font-weight:700}
      </style></head><body>
      <h1>MediFlow · Lab / Radiology report</h1>
      <div class="meta">${order.encounter_number || ""} · ${order.patient_name || ""} · ${new Date().toLocaleString()}</div>
      <div class="box"><div class="label">Test</div><p>${order.order_type} — ${order.details}</p></div>
      <div class="box"><div class="label">Result</div><p>${order.result_text || resultDraft[order.id] || "—"}</p></div>
      <div class="box"><div class="label">Status</div><p>${order.status}</p></div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <ClinicShell
      title="Work queue"
      subtitle="Payment-approved diagnostics only. Collect, result, print."
    >
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatTile label="Ready queue" value={queue.length} tone="navy" />
        <StatTile
          label="Completed results"
          value={queue.filter((order) => order.status === "Completed").length}
          tone="green"
        />
        <StatTile
          label="In progress"
          value={queue.filter((order) => order.status === "InProgress").length}
          tone="orange"
        />
      </div>

      <SectionCard
        kicker="Approved queue"
        title="Diagnostic worklist"
        description="Start tests fast, capture clean results, and print branded reports."
        action={<StatusPill tone="navy">{queue.length} ready</StatusPill>}
      >
        {queue.length === 0 ? (
          <EmptyState
            title="Queue clear"
            hint="Orders appear here only after reception payment approval."
          />
        ) : (
          <div className="space-y-4">
            {queue.map((order) => (
              <QueueItem key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary">
                        <Beaker className="size-3.5" />
                        {order.order_type}
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "PaymentApproved" ? (
                    <Button
                      size="sm"
                      className="shadow-sm"
                      onClick={async () => {
                        await api.post(`/clinic/orders/${order.id}/start/`);
                        toast.success(
                          order.order_type === "lab"
                            ? "Sample / test started"
                            : "Imaging started",
                        );
                        await load();
                      }}
                    >
                      {order.order_type === "lab" ? "Collect / start" : "Start imaging"}
                    </Button>
                  ) : null}
                  {(order.status === "InProgress" || order.status === "PaymentApproved") && (
                    <>
                      <input
                        className="min-w-50 flex-1 rounded-xl border border-primary/10 bg-slate-50 px-3.5 py-2.5 text-sm shadow-inner outline-none transition focus:border-cta/40 focus:bg-white"
                        placeholder="Enter result…"
                        value={resultDraft[order.id] || order.result_text || ""}
                        onChange={(e) =>
                          setResultDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/15 bg-white shadow-sm hover:bg-primary/5"
                        onClick={async () => {
                          await api.post(`/clinic/orders/${order.id}/complete/`, {
                            result_text: resultDraft[order.id] || order.result_text || "",
                          });
                          toast.success("Result forwarded to doctor");
                          await load();
                        }}
                      >
                        Complete & send
                      </Button>
                    </>
                  )}
                  {(order.result_text || resultDraft[order.id]) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary/5"
                      onClick={() => printReport(order)}
                    >
                      <FileText className="size-4" />
                      Print report
                    </Button>
                  )}
                </div>
              </QueueItem>
            ))}
          </div>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
