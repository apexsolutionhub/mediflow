"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleX, Cloud, Loader2, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState, QueueItem, SectionCard, StatTile, StatusPill } from "@/components/ui-chrome";
import { apiErrorDetail } from "@/lib/parallelBatch";
import {
  fetchSyncConflicts,
  fetchSyncStatus,
  runSync,
  summariseCounts,
  SYNC_ENTITY_LABELS,
  type SyncConflict,
  type SyncKind,
  type SyncRun,
  type SyncStatus,
  type SyncStep,
} from "@/lib/sync-api";

function when(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

const STEP_TONE: Record<SyncStep, "navy" | "orange" | "green" | "muted" | "red"> = {
  idle: "muted",
  running: "orange",
  ok: "green",
  failed: "red",
  skipped: "muted",
};

const STEP_LABEL: Record<SyncStep, string> = {
  idle: "Waiting",
  running: "Running",
  ok: "Done",
  failed: "Failed",
  skipped: "Not needed",
};

function Step({ title, step }: { title: string; step: SyncStep }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white px-3.5 py-3">
      <span className="text-sm font-semibold text-primary">{title}</span>
      <StatusPill tone={STEP_TONE[step]}>{STEP_LABEL[step]}</StatusPill>
    </div>
  );
}

function RunSteps({ run }: { run: SyncRun }) {
  const done = run.pull_status === "ok";
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Step title="1. Push to cloud" step={run.push_status} />
      <Step title="2. Pull from cloud" step={run.pull_status} />
      <Step title="3. Complete" step={done ? "ok" : run.pull_status === "failed" ? "failed" : "idle"} />
    </div>
  );
}

export function ManagerSyncPortal() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<SyncKind | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([fetchSyncStatus(), fetchSyncConflicts()]);
      setStatus(s);
      setConflicts(c);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (kind: SyncKind, runId?: string) => {
    setBusy(kind);
    try {
      const run = await runSync(kind, runId);
      const failed = run.push_status === "failed" || run.pull_status === "failed";
      if (failed) {
        toast.error(kind === "seed" ? "Seed did not finish" : "Sync did not finish", {
          description: run.error_message || "Press Retry when the connection is back.",
        });
      } else {
        toast.success(kind === "seed" ? "Seed complete" : "Sync complete");
      }
    } catch (error) {
      toast.error(apiErrorDetail(error, "Could not start sync"));
    } finally {
      setBusy(null);
      await load();
    }
  };

  if (loadError && !status) {
    return (
      <Alert className="rounded-2xl border-rose-200/80 bg-rose-50/70">
        <TriangleAlert className="text-rose-700" />
        <AlertTitle>Sync status could not be loaded</AlertTitle>
        <AlertDescription>Check the connection to the clinic server and try again.</AlertDescription>
      </Alert>
    );
  }
  if (!status) return <p className="text-sm text-muted-foreground">Loading sync status…</p>;

  const latest = status.runs[0];
  const latestFailed = latest && (latest.push_status === "failed" || latest.pull_status === "failed");
  const needsSeed = status.can_sync && !status.seeded_at;
  const working = busy !== null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Running on"
          value={status.node_mode === "clinic" ? "Clinic server" : "Cloud"}
          tone={status.node_mode === "clinic" ? "orange" : "navy"}
          icon={status.node_mode === "clinic" ? Server : Cloud}
        />
        <StatTile
          label="Last sync"
          value={status.last_successful_sync_at ? when(status.last_successful_sync_at) : "Never"}
          tone={status.last_successful_sync_at ? "green" : "rose"}
        />
        <StatTile label="Seeded" value={status.seeded_at ? "Yes" : "Not yet"} tone={status.seeded_at ? "green" : "orange"} />
        <StatTile
          label="Open conflicts"
          value={status.open_conflicts}
          tone={status.open_conflicts ? "rose" : "green"}
        />
      </div>

      {!status.can_sync ? (
        <Alert className="rounded-2xl border-blue-200/80 bg-blue-50/70">
          <Cloud className="text-blue-700" />
          <AlertTitle>Sync runs on the clinic server</AlertTitle>
          <AlertDescription className="leading-6">
            {status.ops_mode === "offline"
              ? "Your clinic works offline. Open MediFlow on your reception server to run a sync; this cloud page only shows the result."
              : "Your clinic works fully on the cloud, so there is nothing to sync."}
          </AlertDescription>
        </Alert>
      ) : null}

      {status.awaiting_step ? (
        <Alert className="rounded-2xl border-emerald-200/80 bg-emerald-50/80">
          <CircleCheck className="text-emerald-700" />
          <AlertTitle>Your mode change is approved</AlertTitle>
          <AlertDescription className="leading-6">
            {status.awaiting_step === "seed"
              ? "Run the initial seed on this server. Offline mode starts when it finishes."
              : "Run a full sync on this server. Cloud mode starts when it finishes."}
          </AlertDescription>
        </Alert>
      ) : null}

      {status.can_sync ? (
        <SectionCard
          kicker="Sync"
          title={needsSeed ? "Set up this server" : "Sync with the cloud"}
          description={
            needsSeed
              ? "The first run copies your clinic data from the cloud onto this server."
              : "Sends today's work to the cloud first, then brings the cloud's changes back. Run it at the end of the day."
          }
          action={
            <div className="flex flex-wrap gap-2">
              {latestFailed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  disabled={working}
                  onClick={() => void start(latest.kind, latest.id)}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Retry
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 rounded-xl"
                disabled={working}
                onClick={() => void start(needsSeed ? "seed" : "sync")}
              >
                {working ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {needsSeed ? "Run initial seed" : "Sync now"}
              </Button>
            </div>
          }
        >
          {latest ? (
            <div className="space-y-3">
              <RunSteps run={latest} />
              {latest.error_message ? (
                <Alert className="rounded-xl border-rose-200/80 bg-rose-50/70">
                  <CircleX className="text-rose-700" />
                  <AlertDescription className="leading-6">{latest.error_message}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No sync yet" hint="Press the button above to start." />
          )}
        </SectionCard>
      ) : null}

      <SectionCard kicker="History" title="Recent runs" description="The last ten sync attempts on this branch.">
        {status.runs.length === 0 ? (
          <EmptyState title="No runs yet" hint="Runs show up here once a sync has been started." />
        ) : (
          <div className="space-y-2">
            {status.runs.map((run) => {
              const failed = run.push_status === "failed" || run.pull_status === "failed";
              const ok = run.pull_status === "ok";
              return (
                <QueueItem key={run.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">
                        {run.kind === "seed" ? "Initial seed" : "Sync"} · {when(run.started_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ok
                          ? [
                              run.receipt.push ? `Sent: ${summariseCounts(run.receipt.push.counts)}` : "",
                              run.receipt.pull ? `Received: ${summariseCounts(run.receipt.pull.counts)}` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : failed
                            ? run.error_message || "Failed"
                            : "In progress"}
                      </p>
                    </div>
                    <StatusPill tone={ok ? "green" : failed ? "red" : "orange"}>
                      {ok ? "Complete" : failed ? "Failed" : "Running"}
                    </StatusPill>
                  </div>
                </QueueItem>
              );
            })}
          </div>
        )}
      </SectionCard>

      {conflicts.length ? (
        <SectionCard
          kicker="Review"
          title="Conflicts"
          description="Both the clinic server and the cloud changed these since the last sync. The cloud copy was kept."
        >
          <div className="space-y-2">
            {conflicts.map((c) => (
              <QueueItem key={c.id}>
                <p className="text-sm font-semibold text-primary">
                  {SYNC_ENTITY_LABELS[c.entity] ?? c.entity}: {c.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.note} · {when(c.created_at)}
                </p>
              </QueueItem>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
