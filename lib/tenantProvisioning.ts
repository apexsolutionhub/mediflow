import type { BillingSnapshot } from "@/lib/api";

/** Created in mediflow_admin — not subject to self-signup approval gates. */
export function isApexProvisionedBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (billing.is_illustration) return true;
  return Boolean(billing.provisioned_by_apex);
}

/** Manager can use /billing to submit setup fee during an active free trial. */
export function isActiveFreeTrialBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  const status = billing.period_status;
  return status === "trial" || status === "trial_ending";
}

/** Logged-in managers on /billing should not be sent to the public signup gate. */
export function shouldRedirectBillingToSignupGate(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (isIllustrationBilling(billing) || isApexProvisionedBilling(billing)) return false;
  if (billing.setup_fee_approved) return false;
  if (isActiveFreeTrialBilling(billing)) return false;
  if (billing.period_status === "trial_expired") return false;
  return billing.period_status === "setup_pending";
}

function isIllustrationBilling(billing: BillingSnapshot): boolean {
  return Boolean(billing.is_illustration);
}
