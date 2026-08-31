"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AUTH_BAND, AUTH_CARD, AuthShell } from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui-chrome";
import { SubmitButton } from "@/components/ui/submit-button";
import { api, clearSession, persistSession, readAccessMode, readBilling, readUser, updateBillingSession } from "@/lib/api";
import type { BillingSnapshot } from "@/lib/api";
import { isSubscriptionPaymentBlocking } from "@/lib/billing-access";
import { isIllustrationBilling } from "@/lib/tenant-demo";
import { billingAlertDescription, billingDueDateLabel } from "@/lib/billing-ui";
import { saveRenewalPending } from "@/lib/renewal-pending";
import { renewalGatePath } from "@/lib/tenant-access";
import {
  deriveRequiredPaymentKind,
  requiredPaymentLabel,
} from "@/lib/billing-payment";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const router = useRouter();
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessMode, setAccessMode] = useState(() =>
    typeof window === "undefined" ? "full" : readAccessMode(),
  );
  const form = useForm({
    defaultValues: { payment_channel: "", transaction_ref: "" },
  });

  useEffect(() => {
    if (!readUser()) {
      router.replace("/");
      return;
    }
    const billingSnapshot = readBilling();
    const currentUser = readUser();
    if (
      currentUser &&
      billingSnapshot &&
      !billingSnapshot.setup_fee_approved &&
      !isIllustrationBilling(billingSnapshot)
    ) {
      router.replace(`/signup?username=${encodeURIComponent(currentUser.username)}`);
      return;
    }
    api
      .get("/billing/me/")
      .then(({ data }) => {
        const snapshot = data.billing as BillingSnapshot;
        const pending = data.pending_submission as
          | { payment_kind?: string; status?: string; rejection_reason?: string }
          | null
          | undefined;

        if (isSubscriptionPaymentBlocking(snapshot, pending) && !isIllustrationBilling(snapshot)) {
          const currentUser = readUser();
          if (currentUser) {
            saveRenewalPending({
              username: currentUser.username,
              clinic_name: snapshot.clinic_name || currentUser.clinic_name,
              clinic_tin: snapshot.clinic_tin || currentUser.clinic_tin,
              phase: pending?.status === "rejected" ? "rejected" : "pending",
              submitted_at: new Date().toISOString(),
            });
            clearSession();
            router.replace(renewalGatePath(currentUser.username));
          }
          return;
        }

        setInfo(data);
        setAccessMode(String(data.access_mode || "full"));
        if (snapshot) {
          updateBillingSession(snapshot, String(data.access_mode || "full"));
        }
      })
      .catch(() => toast.error("Could not load billing"))
      .finally(() => setLoading(false));
  }, [router]);

  const billing = (info?.billing || {}) as BillingSnapshot;
  const status = String(info?.period_status || billing.period_status || "…");
  const dueLabel = billingDueDateLabel(billing);
  const portalLocked = accessMode === "payment_portal";
  const requiredKind = useMemo(() => deriveRequiredPaymentKind(billing), [billing]);
  const paymentRequest = requiredKind ? requiredPaymentLabel(requiredKind, billing) : null;

  const submit = async (values: { payment_channel: string; transaction_ref: string }) => {
    if (!requiredKind) {
      toast.error("No payment is required right now.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/billing/submit-payment/", {
        ...values,
        payment_kind: requiredKind,
      });
      toast.success(data.detail || "Submitted");
      const user = readUser();
      const billing = data.billing as BillingSnapshot;
      const pending = data.pending_submission as
        | { payment_kind?: string; status?: string }
        | null
        | undefined;

      if (user && isSubscriptionPaymentBlocking(billing, pending)) {
        saveRenewalPending({
          username: user.username,
          clinic_name: billing?.clinic_name || user.clinic_name,
          clinic_tin: billing?.clinic_tin || user.clinic_tin,
          phase: "pending",
          submitted_at: new Date().toISOString(),
        });
        clearSession();
        toast.message("Payment submitted — awaiting Apex approval. Sign-in is disabled until verified.");
        router.replace(renewalGatePath(user.username));
        return;
      }

      if (user) {
        persistSession({
          access: localStorage.getItem("auth_token") || "",
          user,
          access_mode: data.access_mode,
          billing: data.billing,
        });
      }
      setInfo(data);
      setAccessMode(String(data.access_mode || accessMode));
      form.reset({ payment_channel: "", transaction_ref: "" });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(String(message || "Submit failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthShell>
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className={cn("gap-0 py-0", AUTH_CARD)}>
        <CardHeader className={cn("space-y-2 px-8 pt-6 pb-3", AUTH_BAND)}>
          <p className="text-[11px] font-medium tracking-[0.22em] text-cta uppercase">
            Subscription
          </p>
          <div className="flex items-center gap-2">
            <CardTitle className="text-primary">Billing portal</CardTitle>
            <StatusPill tone="orange">{status}</StatusPill>
          </div>
          <CardDescription className="text-[15px] leading-relaxed">
            Setup {String(billing.setup_fee_etb || 0)} ETB · Quarterly{" "}
            {String(billing.quarterly_fee_etb || 0)} ETB. One clinic plan, all roles.
          </CardDescription>
          {portalLocked ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950">
              {billingAlertDescription(billing)}
              {dueLabel ? ` Due date: ${dueLabel}.` : ""} Staff cannot sign in until payment is
              verified.
            </p>
          ) : billing.period_status === "warning" || billing.period_status === "trial_ending" ? (
            <p className="rounded-xl border border-primary/10 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-muted-foreground">
              {billingAlertDescription(billing)}
              {dueLabel ? ` Due ${dueLabel}.` : ""}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 px-8 py-5">
          {paymentRequest ? (
            <Alert className="rounded-xl border-primary/15 bg-primary/5">
              <CreditCard className="text-primary" />
              <AlertTitle>{paymentRequest.title}</AlertTitle>
              <AlertDescription className="space-y-1 leading-6">
                <p>
                  Amount due: <span className="font-semibold text-primary">{paymentRequest.amount}</span>
                </p>
                <p>{paymentRequest.description}</p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="rounded-xl">
              <AlertTitle>No payment due</AlertTitle>
              <AlertDescription>
                Apex is not requesting a new transfer right now. You can return to the clinic portal.
              </AlertDescription>
            </Alert>
          )}

          <form className="grid gap-3.5" onSubmit={form.handleSubmit(submit)}>
            <CustomFormField
              control={form.control}
              name="payment_channel"
              fieldType={formFieldTypes.SELECT}
              label="Channel"
              options={[
                { label: "Telebirr", value: "Telebirr" },
                { label: "Commercial Bank of Ethiopia", value: "Commercial Bank of Ethiopia" },
              ]}
            />
            <CustomFormField
              control={form.control}
              name="transaction_ref"
              fieldType={formFieldTypes.INPUT}
              label="Transfer ID"
            />
            <SubmitButton
              size="lg"
              className="h-11 w-full font-semibold"
              loading={submitting}
              loadingLabel="Submitting…"
              disabled={!requiredKind}
            >
              Submit payment proof
            </SubmitButton>
            {!portalLocked ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full"
                onClick={() => router.push("/manager")}
              >
                Back to clinic
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
