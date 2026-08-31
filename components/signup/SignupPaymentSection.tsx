"use client";

import { Building2, Smartphone } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type UseFormSetValue,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { money } from "@/lib/clinic";
import {
  APEX_SOLUTION_CBE_ACCOUNT,
  APEX_WHATSAPP_SUPPORT,
  SETUP_APPROVAL_WAIT_MINUTES,
  SIGNUP_PAYMENT_CHANNEL_META,
  SIGNUP_PAYMENT_CHANNELS,
  type SignupPaymentChannel,
} from "@/lib/signup-payment";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<SignupPaymentChannel, typeof Smartphone> = {
  Telebirr: Smartphone,
  "Commercial Bank of Ethiopia": Building2,
};

type PaymentFields = {
  payment_channel: string;
  payment_transaction_ref: string;
};

export function SignupPaymentSection<T extends FieldValues & PaymentFields>({
  control,
  setValue,
  setupFeeETB,
  compact,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  setupFeeETB: number;
  compact?: boolean;
}) {
  if (setupFeeETB <= 0) return null;

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border border-cta/25 bg-cta/5 p-5 ring-1 ring-primary/5",
        compact && "p-4",
      )}
    >
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Apex Solution — CBE account (all transfers)
        </p>
        <p className="mt-1 font-mono text-xl font-bold tracking-wide text-primary">
          {APEX_SOLUTION_CBE_ACCOUNT}
        </p>
        <p className="mt-1 text-xs text-pretty text-muted-foreground">
          Pay via CBE directly or send from Telebirr to this Commercial Bank of Ethiopia account,
          then enter your transaction reference below.
        </p>
      </div>

      {!compact ? (
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">Setup fee payment</h3>
          <p className="text-sm text-pretty text-muted-foreground">
            Pay <span className="font-semibold text-foreground">{money(setupFeeETB)}</span> to Apex
            Solution using one of the channels below, then enter your transfer reference. After you
            submit registration, wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes for Apex approval
            — you cannot sign in until then. WhatsApp support:{" "}
            {APEX_WHATSAPP_SUPPORT.map((line) => line.e164).join(" or ")}.
          </p>
        </div>
      ) : null}

      <Controller
        control={control}
        name={"payment_channel" as Path<T>}
        rules={{ required: "Select a payment channel" }}
        render={({ field, fieldState }) => (
          <div className="space-y-3">
            <Label>Payment channel</Label>
            <RadioGroup
              className="grid gap-3 sm:grid-cols-2"
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                setValue("payment_transaction_ref" as Path<T>, "" as never);
              }}
            >
              {SIGNUP_PAYMENT_CHANNELS.map((channel) => {
                const meta = SIGNUP_PAYMENT_CHANNEL_META[channel];
                const Icon = CHANNEL_ICONS[channel];
                const selected = field.value === channel;
                return (
                  <Label
                    key={channel}
                    htmlFor={`pay-${channel}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                      selected
                        ? "border-primary/50 bg-primary/5 shadow-sm"
                        : "border-border/80 bg-background/80 hover:bg-muted/30",
                    )}
                  >
                    <RadioGroupItem id={`pay-${channel}`} value={channel} className="mt-1" />
                    <div className="min-w-0 space-y-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="size-4 shrink-0 text-primary" />
                        {meta.shortLabel}
                      </span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {channel === "Telebirr"
                          ? "Mobile money transfer"
                          : "Bank transfer to Apex Solution account"}
                      </p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
            {fieldState.error ? (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            ) : null}
          </div>
        )}
      />

      <Controller
        control={control}
        name={"payment_channel" as Path<T>}
        render={({ field: channelField }) => {
          const channel = channelField.value as SignupPaymentChannel | undefined;
          const meta = channel ? SIGNUP_PAYMENT_CHANNEL_META[channel] : null;

          return (
            <Controller
              control={control}
              name={"payment_transaction_ref" as Path<T>}
              rules={{
                required: "Enter your transaction reference",
                minLength: { value: 4, message: "At least 4 characters" },
              }}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label>{meta?.transactionFieldLabel ?? "Transaction reference"}</Label>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={!channel}
                    placeholder={
                      meta?.transactionPlaceholder ?? "Select a payment channel first"
                    }
                    className="h-11 font-mono text-sm tracking-wide"
                    autoComplete="off"
                  />
                  <p className="text-xs text-pretty text-muted-foreground">
                    {meta?.hint ?? "Choose Telebirr or Commercial Bank of Ethiopia above."}
                  </p>
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />
          );
        }}
      />
    </section>
  );
}
