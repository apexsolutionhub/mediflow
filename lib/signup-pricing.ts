import { api } from "@/lib/api";

export type SignupPricing = {
  setup_fee_etb: number;
  quarterly_fee_etb: number;
  source?: string;
  description?: string;
};

export async function fetchSignupPricing(): Promise<SignupPricing> {
  const { data } = await api.get<SignupPricing>("/billing/pricing/");
  return {
    setup_fee_etb: Number(data.setup_fee_etb ?? 0),
    quarterly_fee_etb: Number(data.quarterly_fee_etb ?? 0),
    source: data.source,
    description: data.description,
  };
}
