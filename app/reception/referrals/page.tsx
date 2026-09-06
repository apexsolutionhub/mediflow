"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  QueueItem,
  ScrollableCatalog,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api, readBilling, readUser, results } from "@/lib/api";
import { type Referral } from "@/lib/clinic";
import { printReferralSlip } from "@/lib/referral-print";

export default function ReceptionReferralsPage() {
  const user = readUser();
  const billing = readBilling();
  const [rows, setRows] = useState<Referral[]>([]);

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
  const printable = useMemo(
    () => rows.filter((r) => r.approval_status === "approved"),
    [rows],
  );

  const printRow = (r: Referral) => {
    try {
      printReferralSlip(r, {
        clinicName: user?.clinic_name || billing?.clinic_name || "Clinic",
        clinicTin: user?.clinic_tin || billing?.clinic_tin,
        branchName: user?.branch_name || billing?.branch_name,
        logoUrl: user?.logoUrl || billing?.logo_url,
        opsMode: billing?.ops_mode,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not print referral");
    }
  };

  return (
    <ClinicShell
      title="Referral prints"
      subtitle="Print manager-approved referral slips. Pending ones stay visible but disabled until approval."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Ready to print" value={printable.length} tone="green" />
        <StatTile label="Awaiting manager" value={pending.length} tone="orange" />
        <StatTile label="Total" value={rows.length} tone="navy" />
      </div>

      <SectionCard
        kicker="Print desk"
        title="Referrals"
        description="Contact the manager when a slip is disabled — print unlocks after approval."
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No referrals yet"
            hint="Doctor referrals appear here for print after manager approval."
            icon={<Share2 className="size-5" />}
          />
        ) : (
          <ScrollableCatalog itemCount={rows.length}>
            <div className="space-y-3">
              {rows.map((r) => {
                const approved = r.approval_status === "approved";
                const pendingStatus = (r.approval_status || "pending") === "pending";
                const outside = r.destination_kind === "external";
                return (
                  <QueueItem
                    key={r.id}
                    className={pendingStatus ? "opacity-75" : undefined}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading font-semibold text-primary">
                            {r.patient_name || "Patient"}
                          </p>
                          <StatusPill
                            tone={
                              approved ? "green" : pendingStatus ? "orange" : "muted"
                            }
                          >
                            {r.approval_status || "pending"}
                          </StatusPill>
                          <StatusPill tone={outside ? "orange" : "navy"}>
                            {outside ? "Outside" : "Same org"}
                          </StatusPill>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Visit {r.encounter_number || "—"}
                        </p>
                        <p className="text-sm">
                          {outside
                            ? r.external_institution?.trim() ||
                              "Outside organization (no institution named)"
                            : `${r.to_branch} · ${r.to_department}`}
                        </p>
                        {pendingStatus ? (
                          <p className="text-xs font-medium text-amber-800">
                            Print disabled — ask the manager to approve this referral.
                          </p>
                        ) : null}
                      </div>
                      {approved ? (
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => printRow(r)}
                        >
                          <Printer className="size-4" />
                          Print slip
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled
                              >
                                <Printer className="size-4" />
                                Print slip
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Contact the manager to approve before printing
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </QueueItem>
                );
              })}
            </div>
          </ScrollableCatalog>
        )}
      </SectionCard>
    </ClinicShell>
  );
}
