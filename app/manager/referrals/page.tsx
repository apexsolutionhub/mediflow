"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type Referral } from "@/lib/clinic";

export default function ManagerReferralsPage() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/clinic/referrals/", { params: { page_size: 100 } });
    setRows(results<Referral>(data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load referrals"));
  }, [load]);

  const pending = useMemo(
    () => rows.filter((r) => (r.approval_status || "pending") === "pending"),
    [rows],
  );
  const approved = useMemo(
    () => rows.filter((r) => r.approval_status === "approved").length,
    [rows],
  );

  const act = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await api.post(`/clinic/referrals/${id}/${action}/`);
      toast.success(action === "approve" ? "Referral approved" : "Referral rejected");
      await load();
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            `Could not ${action} referral`,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ClinicShell
      title="Referral approvals"
      subtitle="Approve same-org and outside referrals before reception can print the slip."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Pending" value={pending.length} tone="orange" />
        <StatTile label="Approved" value={approved} tone="green" />
        <StatTile label="Total" value={rows.length} tone="navy" />
      </div>

      <SectionCard
        kicker="Queue"
        title="Awaiting your approval"
        description="Online clinics use this as an extra check; offline / outside referrals still need approval before the printed handoff."
        action={
          pending.length > 0 ? (
            <StatusPill tone="orange">{pending.length} pending</StatusPill>
          ) : (
            <StatusPill tone="green">Clear</StatusPill>
          )
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="No pending referrals"
            hint="Doctor-sent referrals appear here until you approve or reject them."
            icon={<Share2 className="size-5" />}
          />
        ) : (
          <ScrollArea className="max-h-[36rem] pr-3">
            <div className="space-y-3">
              {pending.map((r) => {
                const outside = r.destination_kind === "external";
                return (
                  <QueueItem key={r.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading font-semibold text-primary">
                            {r.patient_name || "Patient"}
                          </p>
                          <StatusPill tone={outside ? "orange" : "navy"}>
                            {outside ? "Outside" : "Same org"}
                          </StatusPill>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Visit {r.encounter_number || "—"} · by {r.created_by_name || "doctor"}
                        </p>
                        <p className="text-sm text-foreground">
                          {outside
                            ? r.external_institution?.trim() ||
                              "Outside organization (no institution named)"
                            : `${r.to_branch} · ${r.to_department}`}
                        </p>
                        {r.diagnosis ? (
                          <p className="text-xs text-muted-foreground">Dx: {r.diagnosis}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-rose-200 text-rose-700"
                          disabled={busyId === r.id}
                          onClick={() => void act(r.id, "reject")}
                        >
                          <X className="size-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={busyId === r.id}
                          onClick={() => void act(r.id, "approve")}
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </QueueItem>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
