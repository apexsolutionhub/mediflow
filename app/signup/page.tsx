"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AUTH_BAND, AUTH_CARD, AuthShell } from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { ClinicOpsModeSelector } from "@/components/signup/ClinicOpsModeSelector";
import { SalesAgentSelector, type SalesAgentOption } from "@/components/signup/SalesAgentSelector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  DEFAULT_CLINIC_OPS_MODE,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";
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

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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

  const onSubmit = async (values: SignupValues) => {
    setLoading(true);
    try {
      await api.post("/user/", { ...values, role: "manager" });
      setDone(true);
      toast.success("Manager account created");
    } catch (error: unknown) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(JSON.stringify(data?.detail || data || "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <Card className={cn("gap-0 py-0", AUTH_CARD)}>
          <CardHeader className={cn("px-8 pt-8 pb-4 text-center", AUTH_BAND)}>
            <CardTitle className="text-primary">Awaiting Apex approval</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              Your manager credential is ready. You can work during the trial while the setup
              transfer is verified.
            </CardDescription>
          </CardHeader>
          <CardFooter className={cn("justify-center px-8 py-5", AUTH_BAND)}>
            <Link href="/" className="font-medium text-cta underline-offset-4 hover:underline">
              Go to sign in
            </Link>
          </CardFooter>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className={cn("max-w-lg gap-0 py-0", AUTH_CARD)}>
        <CardHeader className={cn("space-y-1.5 px-8 pt-6 pb-2", AUTH_BAND)}>
          <p className="text-[11px] font-medium tracking-[0.22em] text-cta uppercase">
            Clinic signup
          </p>
          <CardTitle className="font-heading text-[1.65rem] text-primary">
            Open your clinic
          </CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            Creates the manager account. All six roles included. Setup{" "}
            {fees.setup_fee_etb.toLocaleString()} ETB, then {fees.quarterly_fee_etb.toLocaleString()}{" "}
            ETB each quarter.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-4 pb-5">
          <form className="grid gap-3.5" onSubmit={form.handleSubmit(onSubmit)}>
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
            <CustomFormField
              control={form.control}
              name="logoUrl"
              fieldType={formFieldTypes.IMAGE_UPLOADER}
              label="Clinic logo"
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Clinic operations mode</Label>
              <p className="text-xs text-muted-foreground">
                Choose how the clinic runs day-to-day — same idea as HotCol digital vs POS.
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
            <CustomFormField
              control={form.control}
              name="payment_channel"
              fieldType={formFieldTypes.SELECT}
              label="Payment channel"
              options={[
                { label: "Telebirr", value: "Telebirr" },
                {
                  label: "Commercial Bank of Ethiopia",
                  value: "Commercial Bank of Ethiopia",
                },
              ]}
            />
            <CustomFormField
              control={form.control}
              name="payment_transaction_ref"
              fieldType={formFieldTypes.INPUT}
              label="Transfer ID"
              placeholder="At least 4 characters"
            />
            <Button type="submit" size="lg" disabled={loading} className="h-11 w-full font-semibold">
              {loading ? "Creating…" : "Create manager account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className={cn("justify-center border-t px-8 py-4", AUTH_BAND)}>
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
