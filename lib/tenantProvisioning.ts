import type { BillingSnapshot } from "@/lib/api";

function isIllustrationBilling(billing: BillingSnapshot): boolean {
  return Boolean(billing.is_illustration);
}

/** Created in mediflow_admin — not subject to self-signup approval gates. */
export function isApexProvisionedBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (billing.is_illustration) return true;
  return Boolean(billing.provisioned_by_apex);
}

function trialEndDatePassed(billing: BillingSnapshot): boolean {
  if (!billing.free_trial_ends_at) return false;
  try {
    const end = new Date(billing.free_trial_ends_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return end.getTime() <= today.getTime();
  } catch {
    return false;
  }
}

/** Free trial ended (due today or earlier) and setup fee is still unpaid. */
export function isFreeTrialEndedBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing || billing.setup_fee_approved) return false;
  if (isIllustrationBilling(billing)) return false;
  if (Number(billing.setup_fee_etb || 0) <= 0) return false;
  if (billing.period_status === "setup_pending") return false;
  if (billing.period_status === "trial_expired") return true;
  if (typeof billing.days_until_due === "number" && billing.days_until_due <= 0) {
    return billing.period_status === "trial" || billing.period_status === "trial_ending";
  }
  return trialEndDatePassed(billing);
}

/** Manager can use /billing to submit setup fee during an active free trial. */
export function isActiveFreeTrialBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing || isFreeTrialEndedBilling(billing)) return false;
  const status = billing.period_status;
  return status === "trial" || status === "trial_ending";
}

/** Clinic must pay setup fee — staff blocked; manager limited to billing portal. */
export function requiresSetupPaymentPortal(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing || billing.setup_fee_approved) return false;
  if (isIllustrationBilling(billing)) return false;
  if (Number(billing.setup_fee_etb || 0) <= 0) return false;
  if (isActiveFreeTrialBilling(billing)) return false;
  if (billing.period_status === "setup_pending") return false;
  return isFreeTrialEndedBilling(billing) || billing.period_status === "trial_expired";
}

/** Logged-in managers on /billing should not be sent to the public signup gate. */
export function shouldRedirectBillingToSignupGate(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (isIllustrationBilling(billing) || isApexProvisionedBilling(billing)) return false;
  if (billing.setup_fee_approved) return false;
  if (isActiveFreeTrialBilling(billing)) return false;
  if (requiresSetupPaymentPortal(billing)) return false;
  return billing.period_status === "setup_pending";
}
