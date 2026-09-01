import type { BillingSnapshot } from "@/lib/api";
import type { SignupPricing } from "@/lib/signup-pricing";

const FALLBACK_SETUP_FEE_ETB = 15000;
const FALLBACK_QUARTERLY_FEE_ETB = 5000;

/** Apply live catalog fees when tenant pricing is not manually locked by Apex. */
export function applyCatalogFeesToBilling(
  billing: BillingSnapshot,
  catalog: SignupPricing | null | undefined,
): BillingSnapshot {
  if (billing.fees_manually_set) return billing;
  const setup = catalog?.setup_fee_etb ?? FALLBACK_SETUP_FEE_ETB;
  const quarterly = catalog?.quarterly_fee_etb ?? FALLBACK_QUARTERLY_FEE_ETB;
  return {
    ...billing,
    setup_fee_etb: setup,
    quarterly_fee_etb: quarterly,
  };
}
