"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CreditCard, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { LoadingButton, SubmitButton } from "@/components/ui/submit-button";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api, readUser } from "@/lib/api";
import { money, paymentTone } from "@/lib/clinic";
import { printCheckoutDocuments, type CheckoutPrintPayload } from "@/lib/checkout-print";
import { invalidateEncounterBoardCache, useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

const MIX_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "insurance", label: "Insurance" },
] as const;

type PayFormValues = {
  amount: number;
  tender_method: string;
  mix_parts: string[];
};

function encodeTenderMethod(method: string, mixParts: string[]): string {
  if (method !== "mixed") return method;
  const parts = MIX_OPTIONS.map((o) => o.id).filter((id) => mixParts.includes(id));
  if (parts.length < 2) return "mixed";
  return `mixed:${parts.join("+")}`;
}

export default function ReceptionCashierPage() {
  const { current, load } = useEncounterBoard("today");
  const [approving, setApproving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const payForm = useForm<PayFormValues>({
    defaultValues: { amount: 0, tender_method: "cash", mix_parts: ["cash", "card"] },
  });

  const tenderMethod = payForm.watch("tender_method");
  const mixParts = payForm.watch("mix_parts");

  const billables = current?.billables ?? [];
  const amountDue = Number(current?.amount_due || 0);
  const unpaidCount = useMemo(
    () => billables.filter((b) => b.payment_status !== "PaymentApproved").length,
    [billables],
  );
  const canApprove = Boolean(current) && unpaidCount > 0 && amountDue > 0;

  useEffect(() => {
    if (!current) return;
    payForm.setValue("amount", amountDue);
  }, [current, amountDue, payForm]);

  const approvePay = async (values: PayFormValues) => {
    if (!current) return;
    if (!canApprove) {
      toast.error("No payment is pending for this visit.");
      return;
    }
    if (values.tender_method === "mixed" && (values.mix_parts?.length || 0) < 2) {
      toast.error("Select at least two tender types for a mixed payment.");
      return;
    }

    setApproving(true);
    try {
      await api.post("/clinic/payments/approve/", {
        encounter: current.id,
        amount: amountDue,
        tender_method: encodeTenderMethod(values.tender_method, values.mix_parts || []),
      });
      toast.success("Payment approved — units unlocked");
      invalidateEncounterBoardCache("today");
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Payment failed",
        ),
      );
    } finally {
      setApproving(false);
    }
  };

  const checkout = async () => {
    if (!current) return;
    setCheckingOut(true);
    try {
      const { data } = await api.post<CheckoutPrintPayload>(
        `/clinic/encounters/${current.id}/checkout/`,
      );
      toast.success("Patient checked out");

      const user = readUser();
      const { printed, dual } = printCheckoutDocuments(data, {
        clinicName: user?.clinic_name || "Clinic",
        clinicTin: user?.clinic_tin,
        branchName: user?.branch_name,
        logoUrl: user?.logoUrl,
      });

      if (!printed) {
        toast.message(dual ? "Health report & external Rx ready" : "Health report ready", {
          description: "Allow pop-ups to print the checkout documents.",
        });
      } else if (dual) {
        toast.message("Printing two sheets", {
          description: "Overall health report + outside-pharmacy prescription.",
        });
      }

      invalidateEncounterBoardCache();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Checkout blocked",
        ),
      );
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <ClinicShell
      title="Cashier"
      subtitle="Approve payment to unlock clinical units, then check out to print the visit health report."
    >
      <SelectedVisitBanner encounter={current} boardHref="/reception" boardLabel="today board" />

      {current ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatTile label="Billable lines" value={billables.length} tone="navy" />
            <StatTile label="Awaiting approval" value={unpaidCount} tone="orange" />
            <StatTile label="Amount due" value={`${money(amountDue)} ETB`} tone="green" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              kicker="Ledger"
              title="Billable items"
              description="Each line must be approved before clinical work proceeds."
            >
              {billables.length === 0 ? (
                <EmptyState title="No billables" hint="Services attach when the encounter opens." />
              ) : (
                <div className="space-y-3">
                  {billables.map((b) => (
                    <QueueItem key={b.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-heading font-semibold text-primary">{b.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(b.total_amount ?? Number(b.unit_price) * b.quantity)} ETB ·{" "}
                            {b.department}
                          </p>
                        </div>
                        <StatusPill tone={paymentTone(b.payment_status)}>
                          {b.payment_status}
                        </StatusPill>
                      </div>
                    </QueueItem>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              kicker="Collection"
              title="Payment & checkout"
              description={
                canApprove
                  ? "Approve the full amount due to unlock doctor, lab, and pharmacy."
                  : "Nothing is pending — wait for new billables or check the patient out."
              }
            >
              <form className="grid gap-4" onSubmit={payForm.handleSubmit(approvePay)}>
                <CustomFormField
                  control={payForm.control}
                  name="amount"
                  fieldType={formFieldTypes.INPUT}
                  type="number"
                  label="Amount to approve (ETB)"
                  description="Fixed from the visit ledger — not editable."
                  disabled
                />
                <CustomFormField
                  control={payForm.control}
                  name="tender_method"
                  fieldType={formFieldTypes.SELECT}
                  label="Tender"
                  disabled={!canApprove}
                  options={[
                    { label: "Cash", value: "cash" },
                    { label: "Card", value: "card" },
                    { label: "Insurance", value: "insurance" },
                    { label: "Mixed", value: "mixed" },
                  ]}
                />
                {tenderMethod === "mixed" && canApprove ? (
                  <Field>
                    <FieldLabel className="text-sm font-medium">Mixed tender parts</FieldLabel>
                    <FieldDescription>
                      Choose which methods combine for this payment (at least two).
                    </FieldDescription>
                    <Controller
                      control={payForm.control}
                      name="mix_parts"
                      render={({ field }) => (
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {MIX_OPTIONS.map((option) => {
                            const checked = (field.value || []).includes(option.id);
                            return (
                              <FieldLabel
                                key={option.id}
                                htmlFor={`mix-${option.id}`}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5",
                                  checked && "border-primary/40 bg-primary/5",
                                )}
                              >
                                <Checkbox
                                  id={`mix-${option.id}`}
                                  checked={checked}
                                  onCheckedChange={(next) => {
                                    const currentParts = field.value || [];
                                    if (next === true) {
                                      field.onChange(
                                        currentParts.includes(option.id)
                                          ? currentParts
                                          : [...currentParts, option.id],
                                      );
                                    } else {
                                      field.onChange(currentParts.filter((p) => p !== option.id));
                                    }
                                  }}
                                />
                                <FieldContent className="gap-0">
                                  <span className="text-sm text-foreground">{option.label}</span>
                                </FieldContent>
                              </FieldLabel>
                            );
                          })}
                        </div>
                      )}
                    />
                    {(mixParts?.length || 0) > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mix: {mixParts.join(" + ")} · total {money(amountDue)} ETB
                      </p>
                    ) : null}
                  </Field>
                ) : null}
                <SubmitButton
                  className={ctaButtonClass}
                  loading={approving}
                  loadingLabel="Approving…"
                  disabled={!canApprove}
                >
                  <Wallet className="size-4" />
                  Approve payment
                </SubmitButton>
              </form>
              <LoadingButton
                type="button"
                variant="outline"
                className="mt-4 h-11 w-full rounded-xl"
                onClick={() => void checkout()}
                disabled={current.status === "closed"}
                loading={checkingOut}
                loadingLabel="Checking out…"
              >
                <Receipt className="size-4" />
                Checkout patient
              </LoadingButton>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/10 bg-slate-50/80 px-4 py-3 text-xs text-muted-foreground">
                <CreditCard className="size-4 shrink-0 text-primary/70" />
                Checkout is blocked until all required billables are approved.
              </div>
            </SectionCard>
          </div>
        </>
      ) : (
        <EmptyState
          title="Select a visit"
          hint="Tap a patient card on the today board to open cashier."
        />
      )}
    </ClinicShell>
  );
}
