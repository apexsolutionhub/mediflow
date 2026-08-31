"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";

type PasswordForm = {
  old_password: string;
  new_password: string;
  confirm_password: string;
};

export default function AccountPasswordPage() {
  const [saving, setSaving] = useState(false);
  const form = useForm<PasswordForm>({
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: PasswordForm) => {
    if (values.new_password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (values.new_password !== values.confirm_password) {
      toast.error("New password and confirmation do not match");
      return;
    }
    try {
      setSaving(true);
      await api.post("/user/change_password/", {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      toast.success("Password updated");
      form.reset();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { old_password?: string[]; detail?: string } } })
        ?.response?.data;
      toast.error(String(data?.old_password?.[0] || data?.detail || "Could not update password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClinicShell
      title="Password"
      subtitle="Update the password for your own MediFlow account."
    >
      <SectionCard
        className="mx-auto max-w-lg"
        kicker="Account security"
        title="Change password"
        description="Enter your current password, then choose a new one."
      >
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/4 to-cta/5 px-4 py-3">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <p className="text-xs leading-5 text-muted-foreground">
            Use at least 6 characters. Your new password applies immediately on next login.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <CustomFormField
            control={form.control}
            name="old_password"
            fieldType={formFieldTypes.INPUT}
            type="password"
            label="Current password"
          />
          <CustomFormField
            control={form.control}
            name="new_password"
            fieldType={formFieldTypes.INPUT}
            type="password"
            label="New password"
          />
          <CustomFormField
            control={form.control}
            name="confirm_password"
            fieldType={formFieldTypes.INPUT}
            type="password"
            label="Confirm new password"
          />
          <SubmitButton size="lg" className={ctaButtonClass} loading={saving} loadingLabel="Updating…">
            <KeyRound className="size-4" />
            Update password
          </SubmitButton>
        </form>
      </SectionCard>
    </ClinicShell>
  );
}
