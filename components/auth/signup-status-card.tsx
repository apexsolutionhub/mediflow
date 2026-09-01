"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Clock3, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AUTH_BAND, AUTH_CARD } from "@/components/auth-shell";
import { SignupPaymentSection } from "@/components/signup/SignupPaymentSection";
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
  fetchSignupStatus,
  resubmitSetupPayment,
  type SignupStatusResponse,
} from "@/lib/signup-api";
import { isIllustrationSignupStatus } from "@/lib/tenant-demo";
import { useBillingCatalogPricing } from "@/lib/hooks/useBillingCatalogPricing";
import {
  clearSignupPending,
  readSignupPending,
  saveSignupPending,
  type SignupPendingRecord,
} from "@/lib/signup-pending";
import { cn } from "@/lib/utils";

type ResubmitValues = {
  payment_channel: string;
  payment_transaction_ref: string;
};

type SignupStatusCardProps = {
  initialUsername?: string;
  onStartFresh?: () => void;
};

export function SignupStatusCard({ initialUsername, onStartFresh }: SignupStatusCardProps) {
  const [pending, setPending] = useState<SignupPendingRecord | null>(null);
  const [status, setStatus] = useState<SignupStatusResponse | null>(null);
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
      const next = await fetchSignupStatus(username);
      setStatus(next);
      if (next.status === "approved" || isIllustrationSignupStatus(next)) {
        clearSignupPending();
      }
    } catch {
      toast.error("Could not refresh registration status");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const stored = readSignupPending();
    if (stored) {
      setPending(stored);
    } else if (initialUsername) {
      setPending({
        username: initialUsername,
        clinic_name: "",
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
      const next = await resubmitSetupPayment({
        username,
        payment_channel: values.payment_channel,
        payment_transaction_ref: values.payment_transaction_ref,
      });
      setStatus(next);
      saveSignupPending({
        username,
        clinic_name: next.clinic_name || pending?.clinic_name || "",
        clinic_tin: next.clinic_tin || pending?.clinic_tin,
        submitted_at: new Date().toISOString(),
      });
      toast.success("Payment details resubmitted — awaiting Apex review");
      resubmitForm.reset();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(
        String(
          detail ||
            "Could not resubmit payment. If this persists, contact Apex support with your clinic TIN.",
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
  const setupFee = status?.setup_fee_etb ?? catalogPricing?.setup_fee_etb ?? 0;
  const isExempt = isIllustrationSignupStatus(status);

  return (
    <Card className={cn("gap-0 py-0", AUTH_CARD)}>
      <CardHeader className={cn("space-y-3 px-8 pt-8 pb-4 text-center", AUTH_BAND)}>
        {loading && !status ? (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Checking registration status…</p>
          </div>
        ) : status?.status === "approved" || isExempt ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-7" />
            </div>
            <CardTitle className="text-primary">
              {isExempt ? "Demo clinic ready" : "Clinic approved"}
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {isExempt
                ? `${clinicLabel} is an illustration account for demos. No billing or Apex approval is required — sign in with your manager password.`
                : `${clinicLabel} is active. You can sign in with your manager account now.`}
            </CardDescription>
          </>
        ) : status?.status === "rejected" ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200">
              <XCircle className="size-7" />
            </div>
            <CardTitle className="text-rose-950">Setup payment rejected</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {clinicLabel} is not active yet. Update your transfer details below and resubmit for
              Apex review. Sign-in stays disabled until approved.
            </CardDescription>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-200">
              <Clock3 className="size-7" />
            </div>
            <CardTitle className="text-primary">Awaiting Apex approval</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {clinicLabel} was registered successfully. Apex is verifying your setup transfer
              {setupFee ? ` (${setupFee.toLocaleString()} ETB)` : ""}. Sign-in is disabled until
              approval completes.
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-4 px-8 py-5">
        {status?.status === "rejected" && status.rejection_reason ? (
          <Alert variant="destructive" className="rounded-xl">
            <ShieldAlert />
            <AlertTitle>Apex note</AlertTitle>
            <AlertDescription>{status.rejection_reason}</AlertDescription>
          </Alert>
        ) : null}

        {status?.status === "pending" ? (
          <Alert className="rounded-xl border-amber-200/80 bg-amber-50/80">
            <Clock3 className="text-amber-700" />
            <AlertTitle className="text-amber-950">Do not sign in yet</AlertTitle>
            <AlertDescription className="leading-6">
              This page refreshes automatically every 20 seconds. You will only be able to sign in
              after Apex approves your setup payment.
            </AlertDescription>
          </Alert>
        ) : null}

        {status?.status === "rejected" ? (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Resubmit payment proof</p>
              <p className="text-xs text-muted-foreground">
                Enter the corrected channel and transfer ID. Apex will review the new submission.
              </p>
            </div>
            <form className="grid gap-3.5" onSubmit={resubmitForm.handleSubmit(handleResubmit)}>
              <SignupPaymentSection
                control={resubmitForm.control}
                setValue={resubmitForm.setValue}
                setupFeeETB={setupFee}
                compact
              />
              <SubmitButton
                size="lg"
                className="h-11 w-full font-semibold"
                loading={resubmitting}
                loadingLabel="Resubmitting…"
              >
                Resubmit payment details
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
        {status?.status === "approved" || isExempt ? (
          <Button asChild className="h-11 w-full font-semibold">
            <Link href="/">Continue to sign in</Link>
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Sign-in is unavailable until Apex approves your clinic.
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
          {onStartFresh ? (
            <Button type="button" variant="link" size="sm" className="text-muted-foreground" onClick={onStartFresh}>
              Register a different clinic
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
