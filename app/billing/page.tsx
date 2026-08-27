"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AUTH_BAND, AUTH_CARD, AuthShell } from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui-chrome";
import { api, persistSession, readAccessMode, readUser, updateBillingSession } from "@/lib/api";
import { billingAlertDescription, billingDueDateLabel } from "@/lib/billing-ui";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const router = useRouter();
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [accessMode, setAccessMode] = useState(() =>
    typeof window === "undefined" ? "full" : readAccessMode(),
  );
  const form = useForm({
    defaultValues: { payment_channel: "", transaction_ref: "", payment_kind: "quarterly" },
  });

  useEffect(() => {
    if (!readUser()) {
      router.replace("/");
      return;
    }
    api
      .get("/billing/me/")
      .then(({ data }) => {
        setInfo(data);
        setAccessMode(String(data.access_mode || "full"));
        if (data.billing) {
          updateBillingSession(data.billing, String(data.access_mode || "full"));
        }
      })
      .catch(() => toast.error("Could not load billing"));
  }, [router]);

  const submit = async (values: { payment_channel: string; transaction_ref: string; payment_kind: string }) => {
    try {
      const { data } = await api.post("/billing/submit-payment/", values);
      toast.success(data.detail || "Submitted");
      const user = readUser();
      if (user) {
        persistSession({
          access: localStorage.getItem("auth_token") || "",
          user,
          access_mode: data.access_mode,
          billing: data.billing,
        });
      }
      setInfo(data);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(String(message || "Submit failed"));
    }
  };

  const billing = (info?.billing || {}) as Record<string, unknown>;
  const status = String(info?.period_status || billing.period_status || "…");
  const billingSnapshot = billing as import("@/lib/api").BillingSnapshot;
  const dueLabel = billingDueDateLabel(billingSnapshot);
  const portalLocked = accessMode === "payment_portal";

  return (
    <AuthShell>
      <Card className={cn("gap-0 py-0", AUTH_CARD)}>
        <CardHeader className={cn("space-y-2 px-8 pt-6 pb-3", AUTH_BAND)}>
          <p className="text-[11px] font-medium tracking-[0.22em] text-cta uppercase">
            Subscription
          </p>
          <div className="flex items-center gap-2">
            <CardTitle className="text-primary">Quarterly billing</CardTitle>
            <StatusPill tone="orange">{status}</StatusPill>
          </div>
          <CardDescription className="text-[15px] leading-relaxed">
            Setup {String(billing.setup_fee_etb || 0)} ETB · Quarterly{" "}
            {String(billing.quarterly_fee_etb || 0)} ETB. One clinic plan, all roles.
          </CardDescription>
          {portalLocked ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950">
              {billingAlertDescription(billingSnapshot)}
              {dueLabel ? ` Due date: ${dueLabel}.` : ""} Staff cannot sign in until payment is
              verified.
            </p>
          ) : billingSnapshot.period_status === "warning" ||
            billingSnapshot.period_status === "trial_ending" ? (
            <p className="rounded-xl border border-primary/10 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-muted-foreground">
              {billingAlertDescription(billingSnapshot)}
              {dueLabel ? ` Due ${dueLabel}.` : ""}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="px-8 py-5">
          <form className="grid gap-3.5" onSubmit={form.handleSubmit(submit)}>
            <CustomFormField
              control={form.control}
              name="payment_kind"
              fieldType={formFieldTypes.SELECT}
              label="Payment kind"
              options={[
                { label: "Setup", value: "setup" },
                { label: "Quarterly", value: "quarterly" },
              ]}
            />
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
            <CustomFormField control={form.control} name="transaction_ref" fieldType={formFieldTypes.INPUT} label="Transfer ID" />
            <Button type="submit" size="lg" className="h-11 w-full font-semibold">
              Submit payment proof
            </Button>
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
