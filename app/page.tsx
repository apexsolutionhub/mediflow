"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AUTH_BAND,
  AUTH_CARD,
  AUTH_PANEL_NAVY,
  AUTH_PANEL_ORANGE,
  AuthShell,
} from "@/components/auth-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_HOME, api, persistSession } from "@/lib/api";
import { fetchSignupStatus } from "@/lib/signup-api";
import { saveSignupPending } from "@/lib/signup-pending";
import { saveRenewalPending } from "@/lib/renewal-pending";
import {
  evaluateLoginAccess,
  gatePathForLoginDecision,
  loginDecisionFromSignupStatus,
  type LoginPayload,
} from "@/lib/tenant-access";
import { isIllustrationSignupStatus } from "@/lib/tenant-demo";
import { cn } from "@/lib/utils";

type LoginValues = { username: string; password: string };

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ defaultValues: { username: "", password: "" } });

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    setError(null);
    try {
      const username = values.username.trim();

      const { data } = await api.post<LoginPayload>(
        "/auth/login/",
        {
          username,
          password: values.password,
        },
        { skipAuth: true },
      );

      let signupStatus = null;
      try {
        signupStatus = await fetchSignupStatus(username);
      } catch {
        signupStatus = null;
      }

      const decision = evaluateLoginAccess(data);
      if (!decision.allowed) {
        if (signupStatus) {
          saveSignupPending({
            username,
            clinic_name: signupStatus.clinic_name || data.user?.clinic_name || "",
            clinic_tin: signupStatus.clinic_tin || data.user?.clinic_tin,
            submitted_at: new Date().toISOString(),
          });
        }
        if (
          decision.code === "quarterly_pending" ||
          decision.code === "quarterly_rejected"
        ) {
          saveRenewalPending({
            username,
            clinic_name: data.user?.clinic_name || signupStatus?.clinic_name || "",
            clinic_tin: data.user?.clinic_tin || signupStatus?.clinic_tin,
            phase: decision.code === "quarterly_rejected" ? "rejected" : "pending",
            submitted_at: new Date().toISOString(),
          });
        }
        setError(decision.message);
        const gatePath = gatePathForLoginDecision(decision);
        if (gatePath !== "/") {
          router.push(gatePath);
        }
        return;
      }

      persistSession(data);
      toast.success("Signed in");
      router.push(decision.destination);
    } catch (err: unknown) {
      const username = values.username.trim();
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not sign in";

      try {
        const signupStatus = await fetchSignupStatus(username);
        if (
          signupStatus &&
          signupStatus.status !== "approved" &&
          !isIllustrationSignupStatus(signupStatus)
        ) {
          const blocked = loginDecisionFromSignupStatus(username, signupStatus);
          if (!blocked.allowed) {
            saveSignupPending({
              username,
              clinic_name: signupStatus.clinic_name || "",
              clinic_tin: signupStatus.clinic_tin,
              submitted_at: new Date().toISOString(),
            });
            setError(blocked.message);
            const gatePath = gatePathForLoginDecision(blocked);
            if (gatePath !== "/") {
              router.push(gatePath);
            }
            return;
          }
        }
      } catch {
        // ignore signup status lookup errors
      }

      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className={cn("gap-0 py-0", AUTH_CARD)}>
        <CardHeader className={cn("space-y-1.5 px-8 pt-6 pb-2 text-center", AUTH_BAND)}>
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Staff access
          </p>
          <CardTitle className="font-heading text-[1.65rem] text-primary">Welcome back</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            Sign in with your staff username and password. Sign-in stays disabled until Apex
            approves setup or quarterly renewal payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-4 pb-5">
          <form className="flex flex-col gap-3.5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className={AUTH_PANEL_NAVY}>
              <CustomFormField
                control={form.control}
                name="username"
                fieldType={formFieldTypes.INPUT}
                label="Username"
                placeholder="Enter your username"
              />
            </div>
            <div className={AUTH_PANEL_ORANGE}>
              <CustomFormField
                control={form.control}
                name="password"
                fieldType={formFieldTypes.INPUT}
                type="password"
                label="Password"
                placeholder="Enter your password"
              />
            </div>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
                {error}
              </div>
            ) : null}
            <SubmitButton
              size="lg"
              className="h-11 w-full font-semibold tracking-wide"
              loading={loading}
              loadingLabel="Signing in…"
            >
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
        <CardFooter className={cn("justify-center border-t px-8 py-4", AUTH_BAND)}>
          <p className="text-center text-sm text-muted-foreground">
            New clinic?{" "}
            <Link
              href="/signup"
              className="font-medium text-cta underline-offset-4 transition-colors hover:text-orange-700 hover:underline"
            >
              Create manager account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
