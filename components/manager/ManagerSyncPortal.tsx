"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleX, Cloud, DatabaseBackup, Loader2, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, QueueItem, SectionCard, StatTile, StatusPill } from "@/components/ui-chrome";
import { apiErrorDetail } from "@/lib/parallelBatch";
import {
  fetchSyncConflicts,
  fetchSyncStatus,
  fieldLabel,
  resolveSyncConflict,
  runBackup,
  runSync,
  showValue,
  summariseCounts,
  SYNC_ENTITY_LABELS,
  type BackupState,
  type BackupStatus,
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

const BACKUP_TONE: Record<BackupState, "green" | "orange" | "red"> = {
  ok: "green",
  stale: "orange",
  failed: "red",
  missing: "red",
};

const BACKUP_LABEL: Record<BackupState, string> = {
  ok: "Backup OK",
  stale: "Backup is old",
  failed: "Last backup failed",
  missing: "No backup yet",
};

function sizeText(bytes?: number | null) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function BackupPanel({
  backup,
  busy,
  onBackup,
}: {
  backup: BackupStatus;
  busy: boolean;
  onBackup: () => void;
}) {
  const needsAttention = backup.state !== "ok";
  return (
    <SectionCard
      kicker="Safety"
      title="Backup"
      description="Sync is not a backup. This copy of the clinic's data is kept on this server (and a second disk if one is set), so a broken PC loses at most a few hours."
      action={
        <Button type="button" variant="outline" className="h-10 rounded-xl" disabled={busy} onClick={onBackup}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <DatabaseBackup className="size-4" />}
          Back up now
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={BACKUP_TONE[backup.state]}>{BACKUP_LABEL[backup.state]}</StatusPill>
          <span className="text-sm text-muted-foreground">
            Last backup: <span className="font-semibold text-primary">{when(backup.last_backup_at)}</span>
            {backup.last_size ? ` · ${sizeText(backup.last_size)}` : ""}
            {backup.count ? ` · ${backup.count} kept` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {backup.secondary_configured ? (
            <>
              <StatusPill tone={backup.secondary_ok === false ? "red" : backup.secondary_ok ? "green" : "orange"}>
                {backup.secondary_ok === false ? "Second copy missing" : backup.secondary_ok ? "Second copy OK" : "Second copy waiting"}
              </StatusPill>
              <span className="text-sm text-muted-foreground">
                Last copied: <span className="font-semibold text-primary">{when(backup.last_secondary_at)}</span>
              </span>
            </>
          ) : (
            <StatusPill tone="orange">No second disk set</StatusPill>
          )}
        </div>
        {backup.last_error ? (
          <Alert className="rounded-xl border-rose-200/80 bg-rose-50/70">
            <CircleX className="text-rose-700" />
            <AlertDescription className="leading-6">{backup.last_error}</AlertDescription>
          </Alert>
        ) : null}
        {backup.secondary_error ? (
          <Alert className="rounded-xl border-amber-200/80 bg-amber-50/70">
            <TriangleAlert className="text-amber-700" />
            <AlertDescription className="leading-6">{backup.secondary_error}</AlertDescription>
          </Alert>
        ) : null}
        {needsAttention && !backup.last_error ? (
          <p className="text-sm text-muted-foreground">
            {backup.state === "missing"
              ? "No backup has been made on this server. Press Back up now."
              : "The last backup is more than a day and a half old. Check that the backup schedule is running."}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}

function ConflictCard({ conflict, onReviewed }: { conflict: SyncConflict; onReviewed: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const kept = conflict.kept === "cloud" ? "cloud" : "clinic server";
  const other = conflict.kept === "cloud" ? "clinic server" : "cloud";

  const review = async () => {
    setSaving(true);
    try {
      await resolveSyncConflict(conflict.id, note);
      toast.success("Marked as reviewed");
      onReviewed();
    } catch (error) {
      toast.error(apiErrorDetail(error, "Could not mark as reviewed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <QueueItem>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-primary">
            {SYNC_ENTITY_LABELS[conflict.entity] ?? conflict.entity}: {conflict.label || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {conflict.note} · {when(conflict.created_at)}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Clinic server{conflict.kept === "server" ? " (kept)" : ""}</th>
                <th className="px-3 py-2 font-medium">Cloud{conflict.kept === "cloud" ? " (kept)" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {conflict.differences.map((d) => (
                <tr key={d.field} className="border-b border-primary/5 last:border-0">
                  <td className="px-3 py-2 font-medium text-primary">{fieldLabel(d.field)}</td>
                  <td className={`px-3 py-2 ${conflict.kept === "server" ? "font-semibold" : "text-muted-foreground"}`}>
                    {showValue(d.server)}
                  </td>
                  <td className={`px-3 py-2 ${conflict.kept === "cloud" ? "font-semibold" : "text-muted-foreground"}`}>
                    {showValue(d.cloud)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          The {kept} copy is now used on both sides. If the {other} version was the right one, enter it again in the
          normal screen, then mark this as reviewed.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional), e.g. entered the new phone number again"
            className="h-10 min-w-0 flex-1 rounded-xl"
            maxLength={255}
            disabled={saving}
          />
          <Button type="button" variant="outline" className="h-10 rounded-xl" disabled={saving} onClick={() => void review()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CircleCheck className="size-4" />}
            Mark as reviewed
          </Button>
        </div>
      </div>
    </QueueItem>
  );
}

export function ManagerSyncPortal() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<SyncKind | null>(null);
  const [backingUp, setBackingUp] = useState(false);

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

  const backUpNow = async () => {
    setBackingUp(true);
    try {
      const result = await runBackup();
      if (result.ok) toast.success("Backup saved");
      else toast.error("Backup failed", { description: result.detail });
    } catch (error) {
      toast.error(apiErrorDetail(error, "Could not back up"));
    } finally {
      setBackingUp(false);
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

      {status.backup ? <BackupPanel backup={status.backup} busy={backingUp} onBackup={() => void backUpNow()} /> : null}

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
                              run.receipt.backup && !run.receipt.backup.ok ? "Backup before sync failed" : "",
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
          title="Conflicts to review"
          description="The same record was changed on the clinic server and in the cloud. Nothing was merged silently: one copy was kept on both sides, and the other change is shown here so you can enter it again if it was the right one."
        >
          <div className="space-y-3">
            {conflicts.map((c) => (
              <ConflictCard key={c.id} conflict={c} onReviewed={() => void load()} />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
