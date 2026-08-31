import type { BillingSnapshot } from "@/lib/api";
import { money } from "@/lib/clinic";

export type RequiredPaymentKind = "setup" | "quarterly";

export function deriveRequiredPaymentKind(
  billing: BillingSnapshot,
): RequiredPaymentKind | null {
  if (!billing.setup_fee_approved) {
    return "setup";
  }
  const status = billing.period_status;
  if (status === "warning" || status === "grace" || status === "expired" || status === "trial_expired") {
    return "quarterly";
  }
  return null;
}

export function requiredPaymentLabel(
  kind: RequiredPaymentKind,
  billing: BillingSnapshot,
): { title: string; amount: string; description: string } {
  if (kind === "setup") {
    return {
      title: "Setup fee (required now)",
      amount: money(billing.setup_fee_etb || 0),
      description:
        "Apex is verifying your initial clinic setup transfer. Submit or update proof below if asked.",
    };
  }
  return {
    title: "Quarterly subscription (required now)",
    amount: money(billing.quarterly_fee_etb || 0),
    description:
      "Your paid quarter has ended or is due. Submit renewal proof so staff can keep signing in.",
  };
}
