"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CreditCard, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { Button } from "@/components/ui/button";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { money, paymentTone } from "@/lib/clinic";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function ReceptionCashierPage() {
  const { current, load } = useEncounterBoard("today");
  const payForm = useForm({ defaultValues: { amount: 0, tender_method: "cash" } });

  useEffect(() => {
    if (!current) return;
    payForm.setValue("amount", Number(current.amount_due || 0));
  }, [current, payForm]);

  const approvePay = async (values: { amount: number; tender_method: string }) => {
    if (!current) return;
    try {
      await api.post("/clinic/payments/approve/", {
        encounter: current.id,
        amount: values.amount,
        tender_method: values.tender_method,
      });
      toast.success("Payment approved — units unlocked");
      await load();
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Payment failed",
        ),
      );
    }
  };

  const checkout = async () => {
    if (!current) return;
    try {
      await api.post(`/clinic/encounters/${current.id}/checkout/`);
      toast.success("Patient checked out");
      await load();
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Checkout blocked",
        ),
      );
    }
  };

  const billables = current?.billables ?? [];
  const amountDue = Number(current?.amount_due || 0);
  const unpaidCount = billables.filter((b) => b.payment_status !== "PaymentApproved").length;

  return (
    <ClinicShell
      title="Cashier"
      subtitle="Approve payment to unlock clinical units, then check out when care is done."
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
              description="Approve tender to unlock doctor, lab, and pharmacy."
            >
              <form className="grid gap-4" onSubmit={payForm.handleSubmit(approvePay)}>
                <CustomFormField
                  control={payForm.control}
                  name="amount"
                  fieldType={formFieldTypes.INPUT}
                  type="number"
                  label="Amount to approve (ETB)"
                />
                <CustomFormField
                  control={payForm.control}
                  name="tender_method"
                  fieldType={formFieldTypes.SELECT}
                  label="Tender"
                  options={[
                    { label: "Cash", value: "cash" },
                    { label: "Card", value: "card" },
                    { label: "Insurance", value: "insurance" },
                    { label: "Mixed", value: "mixed" },
                  ]}
                />
                <Button type="submit" className={ctaButtonClass}>
                  <Wallet className="size-4" />
                  Approve payment
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-11 w-full rounded-xl"
                onClick={() => void checkout()}
                disabled={current.status === "closed"}
              >
                <Receipt className="size-4" />
                Checkout patient
              </Button>
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
          hint="Pick a patient on the today board, then open Cashier from the sidebar."
        />
      )}
    </ClinicShell>
  );
}
