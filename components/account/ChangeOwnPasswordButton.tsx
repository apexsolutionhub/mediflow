"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ctaButtonClass } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type PasswordForm = {
  old_password: string;
  new_password: string;
  confirm_password: string;
};

export function ChangeOwnPasswordButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch (error: unknown) {
      const data = (
        error as { response?: { data?: { old_password?: string[]; detail?: string } } }
      )?.response?.data;
      toast.error(String(data?.old_password?.[0] || data?.detail || "Could not update password"));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "size-9 shrink-0 cursor-pointer border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                className,
              )}
              aria-label="Change password"
            >
              <KeyRound className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Change password</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-md border-border">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password, then choose a new one for your MediFlow account.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-1 flex items-center gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/4 to-cta/5 px-4 py-3">
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
      </DialogContent>
    </Dialog>
  );
}
