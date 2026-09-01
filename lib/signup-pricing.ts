import { api } from "@/lib/api";
import { cacheKey, fetchWithCache } from "@/lib/api-cache";

export type SignupPricing = {
  setup_fee_etb: number;
  quarterly_fee_etb: number;
  source?: string;
  description?: string;
};

export const BILLING_CATALOG_CACHE_KEY = cacheKey(["billing", "pricing"]);
export const BILLING_CATALOG_TTL_MS = 5 * 60_000;

export async function fetchSignupPricing(): Promise<SignupPricing> {
  const data = await fetchWithCache(
    BILLING_CATALOG_CACHE_KEY,
    async () => {
      const { data: response } = await api.get<SignupPricing>("/billing/pricing/", {
        skipAuth: true,
      });
      return response;
    },
    BILLING_CATALOG_TTL_MS,
  );
  return {
    setup_fee_etb: Number(data.setup_fee_etb ?? 0),
    quarterly_fee_etb: Number(data.quarterly_fee_etb ?? 0),
    source: data.source,
    description: data.description,
  };
}
