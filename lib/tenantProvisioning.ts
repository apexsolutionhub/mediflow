import type { BillingSnapshot } from "@/lib/api";

/** Created in mediflow_admin — not subject to self-signup approval gates. */
export function isApexProvisionedBilling(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  if (billing.is_illustration) return true;
  return Boolean(billing.provisioned_by_apex);
}
