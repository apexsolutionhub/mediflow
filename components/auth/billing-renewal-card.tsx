"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Clock3, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AUTH_BAND, AUTH_CARD } from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  fetchRenewalStatus,
  resubmitQuarterlyPayment,
  type RenewalStatusResponse,
} from "@/lib/renewal-api";
import {
  clearRenewalPending,
  readRenewalPending,
  saveRenewalPending,
  type RenewalPendingRecord,
} from "@/lib/renewal-pending";
import { useBillingCatalogPricing } from "@/lib/hooks/useBillingCatalogPricing";
import { cn } from "@/lib/utils";

type ResubmitValues = {
  payment_channel: string;
  payment_transaction_ref: string;
};

type BillingRenewalCardProps = {
  initialUsername?: string;
};

export function BillingRenewalCard({ initialUsername }: BillingRenewalCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<RenewalPendingRecord | null>(null);
  const [status, setStatus] = useState<RenewalStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const catalogPricing = useBillingCatalogPricing();

  const resubmitForm = useForm<ResubmitValues>({
    defaultValues: { payment_channel: "", payment_transaction_ref: "" },
  });

  const username = pending?.username || initialUsername || "";

  const refreshStatus = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchRenewalStatus(username);
      if (next) {
        setStatus(next);
        if (next.status === "active" || next.status === "exempt") {
          clearRenewalPending();
          if (next.status === "exempt") {
            router.replace("/");
          }
        }
      } else if (pending) {
        setStatus({
          status: pending.phase === "rejected" ? "rejected" : "pending",
          clinic_name: pending.clinic_name,
          clinic_tin: pending.clinic_tin,
        });
      }
    } catch {
      if (pending) {
        setStatus({
          status: pending.phase === "rejected" ? "rejected" : "pending",
          clinic_name: pending.clinic_name,
          clinic_tin: pending.clinic_tin,
        });
      } else {
        toast.error("Could not refresh renewal status");
      }
    } finally {
      setLoading(false);
    }
  }, [pending, username]);

  useEffect(() => {
    const stored = readRenewalPending();
    if (stored) {
      setPending(stored);
    } else if (initialUsername) {
      setPending({
        username: initialUsername,
        clinic_name: "",
        phase: "pending",
        submitted_at: new Date().toISOString(),
      });
    }
  }, [initialUsername]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status?.status !== "pending") return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, status?.status]);

  const handleResubmit = async (values: ResubmitValues) => {
    if (!username) return;
    setResubmitting(true);
    try {
      const next = await resubmitQuarterlyPayment({
        username,
        payment_channel: values.payment_channel,
        payment_transaction_ref: values.payment_transaction_ref,
      });
      setStatus(next);
      saveRenewalPending({
        username,
        clinic_name: next.clinic_name || pending?.clinic_name || "",
        clinic_tin: next.clinic_tin || pending?.clinic_tin,
        phase: "pending",
        submitted_at: new Date().toISOString(),
      });
      toast.success("Quarterly payment resubmitted — awaiting Apex review");
      resubmitForm.reset();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(
        String(
          detail ||
            "Could not resubmit payment. Contact Apex support with your clinic TIN if this persists.",
        ),
      );
    } finally {
      setResubmitting(false);
    }
  };

  if (!username && !loading) {
    return null;
  }

  const clinicLabel = status?.clinic_name || pending?.clinic_name || "Your clinic";
  const quarterlyFee = status?.quarterly_fee_etb ?? catalogPricing?.quarterly_fee_etb;
  const isRejected = status?.status === "rejected" || pending?.phase === "rejected";
  const isPending = status?.status === "pending" || (!isRejected && status?.status !== "active");
  const isActive = status?.status === "active";

  return (
    <Card className={cn("gap-0 py-0", AUTH_CARD)}>
      <CardHeader className={cn("space-y-3 px-8 pt-8 pb-4 text-center", AUTH_BAND)}>
        {loading && !status ? (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Checking renewal status…</p>
          </div>
        ) : isActive ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-7" />
            </div>
            <CardTitle className="text-primary">Subscription renewed</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {clinicLabel} quarterly payment is approved. Staff can sign in again.
            </CardDescription>
          </>
        ) : isRejected ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200">
              <XCircle className="size-7" />
            </div>
            <CardTitle className="text-rose-950">Quarterly payment rejected</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {clinicLabel} renewal was not accepted. Update your transfer details below and
              resubmit. Sign-in stays disabled until Apex approves.
            </CardDescription>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-200">
              <Clock3 className="size-7" />
            </div>
            <CardTitle className="text-primary">Awaiting Apex approval</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {clinicLabel} quarterly renewal
              {quarterlyFee ? ` (${quarterlyFee.toLocaleString()} ETB)` : ""} is being verified.
              All staff sign-in stays disabled until approval completes.
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-4 px-8 py-5">
        {isRejected && status?.rejection_reason ? (
          <Alert variant="destructive" className="rounded-xl">
            <ShieldAlert />
            <AlertTitle>Apex note</AlertTitle>
            <AlertDescription>{status.rejection_reason}</AlertDescription>
          </Alert>
        ) : null}

        {isPending && !isRejected ? (
          <Alert className="rounded-xl border-amber-200/80 bg-amber-50/80">
            <Clock3 className="text-amber-700" />
            <AlertTitle className="text-amber-950">Do not sign in yet</AlertTitle>
            <AlertDescription className="leading-6">
              This page refreshes automatically every 20 seconds. Clinic access returns only after
              Apex approves your quarterly payment.
            </AlertDescription>
          </Alert>
        ) : null}

        {isRejected ? (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Resubmit quarterly payment</p>
              <p className="text-xs text-muted-foreground">
                Enter the corrected channel and transfer ID for your quarterly renewal.
              </p>
            </div>
            <form className="grid gap-3.5" onSubmit={resubmitForm.handleSubmit(handleResubmit)}>
              <CustomFormField
                control={resubmitForm.control}
                name="payment_channel"
                fieldType={formFieldTypes.SELECT}
                label="Payment channel"
                options={[
                  { label: "Telebirr", value: "Telebirr" },
                  { label: "Commercial Bank of Ethiopia", value: "Commercial Bank of Ethiopia" },
                ]}
              />
              <CustomFormField
                control={resubmitForm.control}
                name="payment_transaction_ref"
                fieldType={formFieldTypes.INPUT}
                label="Transfer ID"
                placeholder="At least 4 characters"
              />
              <SubmitButton
                size="lg"
                className="h-11 w-full font-semibold"
                loading={resubmitting}
                loadingLabel="Resubmitting…"
              >
                Resubmit quarterly payment
              </SubmitButton>
            </form>
          </>
        ) : null}

        {username ? (
          <p className="text-center text-xs text-muted-foreground">
            Manager username: <span className="font-medium text-foreground">{username}</span>
          </p>
        ) : null}
      </CardContent>

      <CardFooter className={cn("flex flex-col gap-2 px-8 py-5", AUTH_BAND)}>
        {isActive ? (
          <Button asChild className="h-11 w-full font-semibold">
            <Link href="/">Continue to sign in</Link>
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Sign-in is unavailable until Apex approves your quarterly payment.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void refreshStatus()}
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Refreshing…
              </>
            ) : (
              "Refresh status"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
