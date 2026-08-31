import { api } from "@/lib/api";

export type RenewalStatusValue = "active" | "pending" | "rejected" | "renewal_due" | "not_found";

export type RenewalStatusResponse = {
  status: RenewalStatusValue;
  detail?: string;
  clinic_name?: string;
  clinic_tin?: string;
  quarterly_fee_etb?: number;
  rejection_reason?: string;
};

export async function fetchRenewalStatus(username: string): Promise<RenewalStatusResponse | null> {
  try {
    const { data } = await api.get<RenewalStatusResponse>("/billing/renewal-status/", {
      params: { username: username.trim() },
    });
    return data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export type ResubmitQuarterlyPaymentPayload = {
  username: string;
  payment_channel: string;
  payment_transaction_ref: string;
};

/** Resubmit quarterly payment proof after Apex rejection (public endpoint). */
export async function resubmitQuarterlyPayment(payload: ResubmitQuarterlyPaymentPayload) {
  const { data } = await api.post<RenewalStatusResponse>(
    "/billing/resubmit-quarterly/",
    payload,
  );
  return data;
}
