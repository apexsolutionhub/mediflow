import type { BillingSnapshot } from "@/lib/api";

export function billingAlertTitle(billing: BillingSnapshot): string {
  if (billing.period_status === "trial_ending") {
    return "Trial ending";
  }
  if (billing.period_status === "warning") {
    return "Payment due soon";
  }
  return "Subscription";
}

export function billingAlertDescription(billing: BillingSnapshot): string {
  const days = billing.days_until_due;
  const dayLabel =
    days == null ? "soon" : days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;

  if (billing.period_status === "trial_ending") {
    return `Free trial ends ${dayLabel}. Complete setup payment to keep your clinic online.`;
  }
  if (billing.period_status === "warning") {
    return `Quarterly subscription is due ${dayLabel}. Staff login will stop on the due date until payment is verified.`;
  }
  return "Review subscription billing.";
}

export function billingDueDateLabel(billing: BillingSnapshot): string | null {
  if (!billing.due_at) return null;
  try {
    return new Date(billing.due_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}
