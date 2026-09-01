import type { BillingSnapshot } from "@/lib/api";
import type { SignupPricing } from "@/lib/signup-pricing";

/** Apply live catalog fees when tenant pricing is not manually locked. */
export function applyCatalogFeesToBilling(
  billing: BillingSnapshot,
  catalog: SignupPricing | null | undefined,
): BillingSnapshot {
  if (!catalog || billing.fees_manually_set) return billing;
  return {
    ...billing,
    setup_fee_etb: catalog.setup_fee_etb,
    quarterly_fee_etb: catalog.quarterly_fee_etb,
  };
}
