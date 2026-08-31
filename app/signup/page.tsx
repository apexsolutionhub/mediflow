"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SignupStatusCard } from "@/components/auth/signup-status-card";
import {
  AUTH_BAND,
  AUTH_BUTTON,
  AUTH_EYEBROW,
  AUTH_LINK,
  AUTH_MUTED,
  AUTH_SIGNUP_CARD,
  AUTH_SUBTITLE,
  AUTH_TITLE,
  AuthShell,
} from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SignupApprovalNotice } from "@/components/signup/SignupApprovalNotice";
import { ClinicOpsModeSelector } from "@/components/signup/ClinicOpsModeSelector";
import { SignupPaymentSection } from "@/components/signup/SignupPaymentSection";
import { SalesAgentSelector, type SalesAgentOption } from "@/components/signup/SalesAgentSelector";
import { SignupSection } from "@/components/signup/SignupSection";
import { SignupStepper } from "@/components/signup/SignupStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { api } from "@/lib/api";
import { DEFAULT_CLINIC_OPS_MODE, type ClinicOpsMode } from "@/lib/clinicOpsMode";
import { clearSignupPending, readSignupPending, saveSignupPending } from "@/lib/signup-pending";
import { fetchSignupStatus } from "@/lib/signup-api";
import { fetchSignupPricing, type SignupPricing } from "@/lib/signup-pricing";
import { isIllustrationSignupStatus } from "@/lib/tenant-demo";
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

const SIGNUP_STEPS = [
  {
    label: "Clinic",
    title: "Clinic & manager account",
    description:
      "Your branch details, operations mode, and the first manager login for all six staff roles.",
    fields: ["clinic_name", "clinic_tin", "username", "password"] as const,
  },
  {
    label: "Payment",
    title: "Pay & finish",
    description: "Transfer the setup fee, upload your logo, and submit for Apex approval.",
    fields: ["payment_channel", "payment_transaction_ref"] as const,
  },
] as const;

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUsername = searchParams.get("username")?.trim() || "";
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [statusUsername, setStatusUsername] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(Boolean(queryUsername));
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState<"forward" | "back">("forward");
  const [fees, setFees] = useState<SignupPricing | null>(null);
  const [feesLoading, setFeesLoading] = useState(true);
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

  const lastStep = SIGNUP_STEPS.length - 1;
  const copy = SIGNUP_STEPS[step]!;

  useEffect(() => {
    let cancelled = false;
    void fetchSignupPricing()
      .then((pricing) => {
        if (!cancelled) setFees(pricing);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load current pricing — refresh and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setFeesLoading(false);
      });
    api
      .get("/billing/sales-agents/")
      .then(({ data }) => setAgents(data ?? []))
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pending = readSignupPending();
    const username = queryUsername || pending?.username || "";
    if (!username) {
      setCheckingStatus(false);
      return;
    }

    let cancelled = false;
    void fetchSignupStatus(username)
      .then((status) => {
        if (cancelled) return;
        if (isIllustrationSignupStatus(status)) {
          clearSignupPending();
          router.replace(`/?username=${encodeURIComponent(username)}`);
          return;
        }
        setStatusUsername(username);
        setShowForm(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStatusUsername(username);
        setShowForm(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryUsername, router]);

  const goNext = async () => {
    const valid = await form.trigger([...SIGNUP_STEPS[step]!.fields]);
    if (!valid) return;
    setStepDir("forward");
    setStep((current) => Math.min(current + 1, lastStep));
  };

  const goBack = () => {
    setStepDir("back");
    setStep((current) => Math.max(current - 1, 0));
  };

  const onSubmit = async (values: SignupValues) => {
    if (step < lastStep) {
      await goNext();
      return;
    }
    if (!fees) {
      toast.error("Pricing is still loading — wait a moment and try again.");
      return;
    }

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

  if (checkingStatus) {
    return (
      <AuthShell>
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (!showForm && statusUsername) {
    return (
      <AuthShell>
        <SignupStatusCard
          initialUsername={statusUsername}
          onStartFresh={() => {
            clearSignupPending();
            setStatusUsername("");
            setShowForm(true);
            setStep(0);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className={cn("gap-0 py-0", AUTH_SIGNUP_CARD)}>
        <CardHeader className={cn("space-y-6 border-b px-8 pt-9 pb-7", AUTH_BAND)}>
          <SignupStepper
            steps={SIGNUP_STEPS.map(({ label, title, description }) => ({
              label,
              title,
              description,
            }))}
            current={step}
          />
          <div
            key={`${step}-copy`}
            className="animate-in fade-in slide-in-from-bottom-2 space-y-2 duration-400"
          >
            <p className={AUTH_EYEBROW}>
              Step {step + 1} of {SIGNUP_STEPS.length}
            </p>
            <CardTitle className={cn("text-2xl", AUTH_TITLE)}>{copy.title}</CardTitle>
            <CardDescription className={cn("max-w-xl", AUTH_SUBTITLE)}>
              {copy.description}
            </CardDescription>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Setup fee
                </p>
                <p className="font-heading text-lg font-semibold text-primary">
                  {feesLoading ? (
                    <Loader2 className="inline size-5 animate-spin text-muted-foreground" />
                  ) : (
                    `${(fees?.setup_fee_etb ?? 0).toLocaleString()} ETB`
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-cta/20 bg-cta/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Quarterly
                </p>
                <p className="font-heading text-lg font-semibold text-primary">
                  {feesLoading ? (
                    <Loader2 className="inline size-5 animate-spin text-muted-foreground" />
                  ) : (
                    `${(fees?.quarterly_fee_etb ?? 0).toLocaleString()} ETB`
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-8 pt-7 pb-0">
          <form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <div
              key={step}
              className={cn(
                "flex flex-col gap-8 animate-in fade-in duration-500 fill-mode-both",
                stepDir === "back" ? "slide-in-from-left-6" : "slide-in-from-right-6",
              )}
            >
              {step === 0 ? (
                <>
                  <SignupSection
                    title="Clinic details"
                    description="Legal name and TIN for your branch."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                  </SignupSection>

                  <SignupSection
                    title="Manager account"
                    description="Username and password for the first manager login."
                    tone="cool"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
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
                  </SignupSection>

                  <SignupSection
                    title="Operations & sales"
                    description="How your branch runs day-to-day, and who referred you (optional)."
                    tone="cool"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Clinic operations mode</Label>
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
                      <p className={cn("text-xs", AUTH_MUTED)}>
                        Skip this if you found MediFlow yourself.
                      </p>
                    </div>
                  </SignupSection>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  {feesLoading || !fees ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-muted/30 px-4 py-12 text-sm text-muted-foreground">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      Loading current pricing from Apex catalog…
                    </div>
                  ) : (
                    <SignupPaymentSection
                      control={form.control}
                      setValue={form.setValue}
                      setupFeeETB={fees.setup_fee_etb}
                    />
                  )}
                  <SignupSection title="Branding" tone="warm">
                    <CustomFormField
                      control={form.control}
                      name="logoUrl"
                      fieldType={formFieldTypes.IMAGE_UPLOADER}
                      label="Clinic logo"
                    />
                  </SignupSection>
                  {fees && fees.setup_fee_etb > 0 ? <SignupApprovalNotice /> : null}
                </>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-8 -mx-8 flex flex-col-reverse gap-3 border-t px-8 pt-7 pb-8 sm:flex-row sm:items-center sm:justify-between",
                AUTH_BAND,
              )}
            >
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 sm:min-w-28"
                  onClick={goBack}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
              {step < lastStep ? (
                <Button
                  type="submit"
                  className={cn(
                    "h-11 gap-2 font-semibold",
                    AUTH_BUTTON,
                    "w-full sm:ml-auto sm:w-auto sm:min-w-44",
                  )}
                >
                  Proceed
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <SubmitButton
                  size="lg"
                  className={cn(
                    "h-11 w-full font-semibold sm:w-auto sm:min-w-48",
                    AUTH_BUTTON,
                  )}
                  loading={loading || feesLoading}
                  loadingLabel="Creating clinic…"
                  disabled={!fees}
                >
                  {fees
                    ? `Submit · ${fees.setup_fee_etb.toLocaleString()} ETB`
                    : "Submit for Apex approval"}
                </SubmitButton>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className={cn("justify-center border-t px-8 py-6", AUTH_BAND)}>
          <p className={cn("text-center text-sm", AUTH_MUTED)}>
            Already registered?{" "}
            <Link href="/" className={AUTH_LINK}>
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
