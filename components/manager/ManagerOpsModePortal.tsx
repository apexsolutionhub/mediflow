"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Cloud,
  Clock,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicOpsModeSelector } from "@/components/signup/ClinicOpsModeSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import {
  CLINIC_OPS_MODE_DESCRIPTIONS,
  CLINIC_OPS_MODE_LABELS,
  CLINIC_OPS_MODE_SHORT_LABELS,
  OPS_MODE_REQUEST_STATUS_LABELS,
  opsModeTransitionSummary,
  parseClinicOpsMode,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";
import { type OpsModeRequest, useOpsModeStatus } from "@/lib/hooks/useOpsModeStatus";
import { cn } from "@/lib/utils";

function ModeHeroBadge({ mode }: { mode: ClinicOpsMode }) {
  const offline = mode === "offline";
  const Icon = offline ? HardDrive : Cloud;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6 sm:p-8",
        offline
          ? "border-cta/25 bg-linear-to-br from-cta/10 via-amber-50/40 to-white"
          : "border-primary/15 bg-linear-to-br from-primary/8 via-sky-50/30 to-white",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-40 rounded-full blur-3xl",
          offline ? "bg-cta/20" : "bg-primary/15",
        )}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "inline-flex size-14 shrink-0 items-center justify-center rounded-2xl ring-1",
              offline
                ? "bg-cta/15 text-amber-900 ring-cta/25"
                : "bg-primary/10 text-primary ring-primary/20",
            )}
          >
            <Icon className="size-7" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Current operating mode
            </p>
            <h2 className="font-heading mt-1 text-2xl font-semibold text-primary sm:text-3xl">
              {CLINIC_OPS_MODE_LABELS[mode]}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {CLINIC_OPS_MODE_DESCRIPTIONS[mode]}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1",
            offline
              ? "bg-cta/12 text-amber-900 ring-cta/25"
              : "bg-primary/10 text-primary ring-primary/15",
          )}
        >
          <span className="relative flex size-2">
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                offline ? "bg-amber-500" : "bg-primary",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                offline ? "bg-amber-600" : "bg-primary",
              )}
            />
          </span>
          Live · {CLINIC_OPS_MODE_SHORT_LABELS[mode]}
        </span>
      </div>
    </div>
  );
}

const RequestHistoryRow = memo(function RequestHistoryRow({ row }: { row: OpsModeRequest }) {
  const from = parseClinicOpsMode(row.current_ops_mode);
  const to = parseClinicOpsMode(row.requested_ops_mode);
  const statusLabel = OPS_MODE_REQUEST_STATUS_LABELS[row.status] || row.status;

  return (
    <QueueItem>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-primary">{CLINIC_OPS_MODE_SHORT_LABELS[from]}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-primary">{CLINIC_OPS_MODE_SHORT_LABELS[to]}</span>
            {row.applies_immediately ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-cta/20">
                No sync
              </span>
            ) : null}
          </div>
          {row.request_note ? (
            <p className="text-sm leading-6 text-muted-foreground">{row.request_note}</p>
          ) : null}
          {row.review_note ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Apex:</span> {row.review_note}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
            {row.requested_by_username ? ` · ${row.requested_by_username}` : ""}
          </p>
        </div>
        <StatusPill
          tone={
            row.status === "applied" || row.status === "approved"
              ? "green"
              : row.status === "pending"
                ? "orange"
                : row.status === "rejected"
                  ? "rose"
                  : "navy"
          }
        >
          {statusLabel}
        </StatusPill>
      </div>
    </QueueItem>
  );
});

function WorkflowSteps({
  from,
  to,
}: {
  from: ClinicOpsMode;
  to: ClinicOpsMode;
}) {
  const transition = opsModeTransitionSummary(from, to);

  const steps = transition.appliesOnApprovalWithoutSync
    ? [
        { icon: ShieldCheck, title: "Submit to Apex", detail: "Explain why you need offline LAN operation." },
        { icon: Clock, title: "Apex approval", detail: "Apex reviews your request." },
        { icon: Server, title: "Offline goes live", detail: "On approval, offline mode starts — no sync step." },
      ]
    : [
        { icon: ShieldCheck, title: "Submit to Apex", detail: "Explain why you are ready for cloud mode again." },
        { icon: Clock, title: "Apex approval", detail: "Apex reviews your request." },
        { icon: RefreshCw, title: "Full sync", detail: "Push + pull — cloud mode starts after sync completes." },
      ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div
            key={step.title}
            className="rounded-2xl border border-primary/10 bg-white/70 px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <Icon className="size-4 text-primary/70" />
            </div>
            <p className="mt-3 text-sm font-semibold text-primary">{step.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ManagerOpsModePortal() {
  const { status, currentMode, loading, refreshing, apiUnavailable, load, submitRequest } =
    useOpsModeStatus();
  const [targetMode, setTargetMode] = useState<ClinicOpsMode>("offline");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (status?.next_mode) {
      setTargetMode(parseClinicOpsMode(status.next_mode));
    }
  }, [status?.next_mode, status?.ops_mode]);

  const effectiveTarget = targetMode;

  const transition = useMemo(
    () => opsModeTransitionSummary(currentMode, effectiveTarget),
    [currentMode, effectiveTarget],
  );

  const pendingCount = status?.pending_request ? 1 : 0;
  const awaitingSync = status?.approved_awaiting_sync ? 1 : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitRequest(effectiveTarget, note);
      setNote("");
      setConfirmOpen(false);
      toast.success("Request sent to Apex", {
        description: transition.appliesOnApprovalWithoutSync
          ? "After Apex approves, offline mode starts right away — no sync required."
          : "After Apex approves, complete a full sync before cloud mode is active.",
      });
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not submit request",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Loading operating mode…</p>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <RefreshCw className={cn("mr-2 size-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <ModeHeroBadge mode={currentMode} />

      {apiUnavailable ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
          Live request status could not be loaded — you can still submit a mode change below. If
          submit fails, the clinic API needs the latest ops-mode routes deployed.
        </div>
      ) : null}

      {status.approved_awaiting_sync ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="green">Approved — sync required</StatusPill>
            <span className="text-sm font-medium text-primary">
              {CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(status.approved_awaiting_sync.current_ops_mode)]}
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">
              {CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(status.approved_awaiting_sync.requested_ops_mode)]}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Apex approved your return to cloud mode. Run a full sync (push + pull) from the sync
            portal when your reception server is ready — staff stay on offline LAN until sync
            completes.
          </p>
        </div>
      ) : null}

      {status.pending_request ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="orange">Awaiting Apex</StatusPill>
            <span className="text-sm font-medium text-primary">
              {CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(status.pending_request.current_ops_mode)]}
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">
              {CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(status.pending_request.requested_ops_mode)]}
            </span>
          </div>
          {status.pending_request.request_note ? (
            <p className="mt-3 text-sm text-muted-foreground">{status.pending_request.request_note}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Submitted {new Date(status.pending_request.created_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      {status.latest_request?.status === "rejected" && !status.pending_request ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 px-5 py-4">
          <p className="font-medium text-rose-900">Last request was rejected</p>
          {status.latest_request.review_note ? (
            <p className="mt-1 text-sm text-muted-foreground">{status.latest_request.review_note}</p>
          ) : null}
        </div>
      ) : null}

      {status.can_request_change ? (
        <SectionCard
          kicker="Request change"
          title={currentMode === "online" ? "Move clinic offline" : "Return to cloud"}
          description={transition.detail}
          action={<StatusPill tone="navy">Apex review</StatusPill>}
        >
          <div className="space-y-6">
            <WorkflowSteps from={currentMode} to={effectiveTarget} />

            <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Target mode
              </p>
              <ClinicOpsModeSelector
                value={effectiveTarget}
                onChange={setTargetMode}
                disabled={submitting}
                disabledModes={[currentMode]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ops-note">Reason for Apex</Label>
              <Textarea
                id="ops-note"
                className="min-h-[96px] rounded-xl"
                placeholder={
                  transition.appliesOnApprovalWithoutSync
                    ? "e.g. Unreliable internet — need offline LAN with evening sync"
                    : "e.g. Stable fiber installed — ready to return staff to cloud URLs"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{transition.headline}</span>
                {" — "}
                {transition.appliesOnApprovalWithoutSync
                  ? "Both directions need Apex approval; offline starts on approval without sync."
                  : "Returning to cloud always needs Apex approval and a successful sync after."}
              </p>
              <Button
                type="button"
                className={cn("h-11 shrink-0 rounded-xl px-6", ctaButtonClass)}
                disabled={submitting}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  "Submit to Apex"
                )}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          kicker="Request change"
          title="Mode change in progress"
          description="You cannot start another request until the current one is finished."
        >
          <p className="text-sm leading-6 text-muted-foreground">
            {status.pending_request
              ? "Your request is with Apex for review."
              : status.approved_awaiting_sync
                ? "Apex approved your return to cloud — complete a full sync first."
                : "Check the status banners above for details."}
          </p>
        </SectionCard>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Current mode"
          value={CLINIC_OPS_MODE_SHORT_LABELS[currentMode]}
          tone={currentMode === "offline" ? "orange" : "navy"}
        />
        <StatTile
          label="Pending Apex"
          value={pendingCount}
          tone={pendingCount ? "orange" : "green"}
        />
        <StatTile
          label="Awaiting sync"
          value={awaitingSync}
          tone={awaitingSync ? "orange" : "green"}
        />
      </div>

      <SectionCard
        kicker="History"
        title="Mode change log"
        description="Recent requests and outcomes for this clinic."
      >
        {status.recent_requests.length === 0 ? (
          <EmptyState
            title="No mode changes yet"
            hint="When you switch modes, the audit trail appears here."
          />
        ) : (
          <ScrollArea className="max-h-[28rem] pr-3">
            <div className="space-y-3">
              {status.recent_requests.map((row) => (
                <RequestHistoryRow key={row.id} row={row} />
              ))}
            </div>
          </ScrollArea>
        )}
      </SectionCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit mode change to Apex?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {transition.appliesOnApprovalWithoutSync ? (
                <>
                  Apex will review your request to move to{" "}
                  <strong>{CLINIC_OPS_MODE_LABELS.offline}</strong>. If approved, offline mode
                  starts immediately — no sync step. Until then, the clinic stays on cloud mode.
                </>
              ) : (
                <>
                  Apex will review your request to return to{" "}
                  <strong>{CLINIC_OPS_MODE_LABELS.online}</strong>. If approved, you must complete
                  a full sync before cloud mode is active. Until then, keep using the offline LAN
                  server.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("rounded-xl", ctaButtonClass)}
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              {submitting ? "Please wait…" : "Submit to Apex"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Compact overview teaser — uses session billing snapshot (no extra API call). */
export function ManagerOpsModeOverviewTeaser() {
  const { status, currentMode } = useOpsModeStatus({ fetchDetails: false });
  if (!status) return null;

  return (
    <SectionCard
      kicker="Infrastructure"
      title="Operating mode"
      description="Cloud vs local reception server — switch when your connectivity changes."
      action={
        <StatusPill tone={currentMode === "offline" ? "orange" : "navy"}>
          {CLINIC_OPS_MODE_SHORT_LABELS[currentMode]}
        </StatusPill>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            {currentMode === "offline" ? (
              <HardDrive className="size-5" />
            ) : (
              <Cloud className="size-5" />
            )}
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-primary">
              {CLINIC_OPS_MODE_LABELS[currentMode]}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage mode changes, history, and sync guidance.
            </p>
          </div>
        </div>
        <Button asChild className={cn("h-11 rounded-xl", ctaButtonClass)}>
          <Link href="/manager/ops-mode">
            Manage mode
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </SectionCard>
  );
}
