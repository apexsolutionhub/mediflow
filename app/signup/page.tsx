"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Building2, CreditCard, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { SignupStatusCard } from "@/components/auth/signup-status-card";
import { AUTH_BAND, AUTH_CARD, AuthShell } from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { ClinicOpsModeSelector } from "@/components/signup/ClinicOpsModeSelector";
import { SalesAgentSelector, type SalesAgentOption } from "@/components/signup/SalesAgentSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/ui/submit-button";
import { api } from "@/lib/api";
import { DEFAULT_CLINIC_OPS_MODE, type ClinicOpsMode } from "@/lib/clinicOpsMode";
import { clearSignupPending, readSignupPending, saveSignupPending } from "@/lib/signup-pending";
import { cn } from "@/lib/utils";

type SignupValues = {
  username: string;
  password: string;
  clinic_name: string;
  clinic_tin: string;
  logoUrl: string;
  payment_channel: string;
  payment_transaction_ref: string;
  sales_agent_id: number | null;
  ops_mode: ClinicOpsMode;
};

function SignupPageContent() {
  const searchParams = useSearchParams();
  const queryUsername = searchParams.get("username")?.trim() || "";
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [statusUsername, setStatusUsername] = useState("");
  const [fees, setFees] = useState({ setup_fee_etb: 15000, quarterly_fee_etb: 5000 });
  const form = useForm<SignupValues>({
    defaultValues: {
      username: "",
      password: "",
      clinic_name: "",
      clinic_tin: "",
      logoUrl: "",
      payment_channel: "",
      payment_transaction_ref: "",
      sales_agent_id: null,
      ops_mode: DEFAULT_CLINIC_OPS_MODE,
    },
  });
  const [agents, setAgents] = useState<SalesAgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    api.get("/billing/pricing/").then(({ data }) => setFees(data)).catch(() => undefined);
    api
      .get("/billing/sales-agents/")
      .then(({ data }) => setAgents(data ?? []))
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false));
  }, []);

  useEffect(() => {
    const pending = readSignupPending();
    const username = queryUsername || pending?.username || "";
    setStatusUsername(username);
    if (username) {
      setShowForm(false);
    }
  }, [queryUsername]);

  const onSubmit = async (values: SignupValues) => {
    setLoading(true);
    try {
      await api.post("/user/", { ...values, role: "manager" });
      const username = values.username.trim();
      saveSignupPending({
        username,
        clinic_name: values.clinic_name.trim(),
        clinic_tin: values.clinic_tin.trim(),
        submitted_at: new Date().toISOString(),
      });
      setStatusUsername(username);
      setShowForm(false);
      toast.success("Clinic registered — awaiting Apex approval");
    } catch (error: unknown) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(String(data?.detail || data || "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!showForm && statusUsername) {
    return (
      <AuthShell>
        <SignupStatusCard
          initialUsername={statusUsername}
          onStartFresh={() => {
            clearSignupPending();
            setStatusUsername("");
            setShowForm(true);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className={cn("max-w-lg gap-0 py-0", AUTH_CARD)}>
        <CardHeader className={cn("space-y-3 px-8 pt-6 pb-2", AUTH_BAND)}>
          <p className="text-[11px] font-medium tracking-[0.22em] text-cta uppercase">
            Clinic signup
          </p>
          <CardTitle className="font-heading text-[1.65rem] text-primary">Open your clinic</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            One manager account for your branch. All six staff roles included after Apex approves
            your setup payment.
          </CardDescription>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Setup fee
              </p>
              <p className="font-heading text-lg font-semibold text-primary">
                {fees.setup_fee_etb.toLocaleString()} ETB
              </p>
            </div>
            <div className="rounded-xl border border-cta/20 bg-cta/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Quarterly
              </p>
              <p className="font-heading text-lg font-semibold text-primary">
                {fees.quarterly_fee_etb.toLocaleString()} ETB
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-8 py-5">
          <Alert className="rounded-xl border-primary/15 bg-slate-50/80">
            <CreditCard className="text-primary" />
            <AlertTitle className="text-primary">Payment required at signup</AlertTitle>
            <AlertDescription className="leading-6">
              Transfer the setup fee ({fees.setup_fee_etb.toLocaleString()} ETB) via Telebirr or CBE,
              then enter the transfer ID below. Sign-in stays disabled until Apex approves.
            </AlertDescription>
          </Alert>

          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Building2 className="size-4 text-cta" />
                Clinic details
              </div>
              <CustomFormField
                control={form.control}
                name="clinic_name"
                fieldType={formFieldTypes.INPUT}
                label="Clinic name"
                placeholder="Sunrise Clinic"
              />
              <CustomFormField
                control={form.control}
                name="clinic_tin"
                fieldType={formFieldTypes.INPUT}
                label="Clinic TIN"
                placeholder="0000000000"
              />
              <CustomFormField
                control={form.control}
                name="logoUrl"
                fieldType={formFieldTypes.IMAGE_UPLOADER}
                label="Clinic logo"
              />
            </div>

            <Separator className="bg-primary/8" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <UserRound className="size-4 text-cta" />
                Manager account
              </div>
              <CustomFormField
                control={form.control}
                name="username"
                fieldType={formFieldTypes.INPUT}
                label="Manager username"
              />
              <CustomFormField
                control={form.control}
                name="password"
                fieldType={formFieldTypes.INPUT}
                type="password"
                label="Password"
              />
            </div>

            <Separator className="bg-primary/8" />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Clinic operations mode</Label>
              <p className="text-xs text-muted-foreground">
                How your branch runs day-to-day — you can request changes later from the manager portal.
              </p>
              <ClinicOpsModeSelector
                value={form.watch("ops_mode")}
                onChange={(next) => form.setValue("ops_mode", next)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sales agent (optional)</Label>
              <SalesAgentSelector
                value={form.watch("sales_agent_id")}
                onChange={(next) => form.setValue("sales_agent_id", next)}
                agents={agents}
                loading={agentsLoading}
              />
            </div>

            <Separator className="bg-primary/8" />

            <div className="space-y-3 rounded-2xl border border-cta/20 bg-cta/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CreditCard className="size-4 text-cta" />
                Setup payment proof
              </div>
              <CustomFormField
                control={form.control}
                name="payment_channel"
                fieldType={formFieldTypes.SELECT}
                label="Payment channel"
                options={[
                  { label: "Telebirr", value: "Telebirr" },
                  { label: "Commercial Bank of Ethiopia", value: "Commercial Bank of Ethiopia" },
                ]}
              />
              <CustomFormField
                control={form.control}
                name="payment_transaction_ref"
                fieldType={formFieldTypes.INPUT}
                label="Transfer ID"
                placeholder="At least 4 characters"
              />
            </div>

            <SubmitButton
              size="lg"
              className="h-11 w-full font-semibold"
              loading={loading}
              loadingLabel="Creating clinic…"
            >
              Submit for Apex approval
            </SubmitButton>
          </form>
        </CardContent>

        <CardFooter className={cn("justify-center border-t px-8 py-4", AUTH_BAND)}>
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
            {statusUsername ? (
              <>
                {" "}
                ·{" "}
                <button
                  type="button"
                  className="font-medium text-cta underline-offset-4 hover:underline"
                  onClick={() => setShowForm(false)}
                >
                  Check approval status
                </button>
              </>
            ) : null}
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </AuthShell>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
