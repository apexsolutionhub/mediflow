"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useOpsModeStatus } from "@/lib/hooks/useOpsModeStatus";
import { fetchSyncStatus, type SyncFreshness } from "@/lib/sync-api";

function wording(f: SyncFreshness): { title: string; body: string; urgent: boolean } {
  if (f.overdue) {
    return {
      title: "Staff are locked out until you sync",
      body: "This clinic server has gone too long without syncing with the cloud. Staff cannot sign in until a sync completes.",
      urgent: true,
    };
  }
  if (f.warn && f.days_left !== null) {
    const days = f.days_left === 0 ? "today" : f.days_left === 1 ? "in 1 day" : `in ${f.days_left} days`;
    return {
      title: "Sync soon, or staff will be locked out",
      body: `Staff will be locked out ${days} unless you sync with the cloud.`,
      urgent: true,
    };
  }
  return {
    title: "Last night's sync did not happen",
    body: "Sync now so today's start is safely copied to the cloud. It only takes a minute.",
    urgent: false,
  };
}

/**
 * The morning reminder (docs/OFFLINE_SYNC_CONTRACT.md 8.1) and the freshness warning (8.4) for the manager
 * overview. Shows nothing for online clinics, and nothing when the sync is up to date.
 */
export function SyncReminderBanner() {
  const { currentMode } = useOpsModeStatus({ fetchDetails: false });
  const [freshness, setFreshness] = useState<SyncFreshness | null>(null);

  useEffect(() => {
    if (currentMode !== "offline") return;
    let cancelled = false;
    fetchSyncStatus()
      .then((status) => {
        if (!cancelled) setFreshness(status.freshness);
      })
      .catch(() => {
        /* a reminder is a convenience: stay quiet if it cannot be loaded */
      });
    return () => {
      cancelled = true;
    };
  }, [currentMode]);

  if (currentMode !== "offline" || !freshness || !freshness.applies || !freshness.due) return null;
  const text = wording(freshness);

  return (
    <Alert
      className={
        text.urgent ? "mb-6 rounded-2xl border-rose-200/80 bg-rose-50/80" : "mb-6 rounded-2xl border-amber-200/80 bg-amber-50/70"
      }
    >
      <TriangleAlert className={text.urgent ? "text-rose-700" : "text-amber-700"} />
      <AlertTitle>{text.title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3 leading-6">
        <span>{text.body}</span>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/manager/sync">
            <RefreshCw className="size-4" />
            Go to Sync
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
