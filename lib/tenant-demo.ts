import type { BillingSnapshot } from "@/lib/api";
import type { SignupStatusResponse } from "@/lib/signup-api";

/** Illustration / exempt tenants are demo-only — no billing or Apex approval gates. */
export function isIllustrationBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (billing.is_illustration === true) return true;
  return String(billing.period_status || "").toLowerCase() === "exempt";
}

export function isIllustrationSignupStatus(
  status: SignupStatusResponse | null | undefined,
): boolean {
  if (!status) return false;
  if (status.is_illustration === true) return true;
  return status.status === "exempt";
}
