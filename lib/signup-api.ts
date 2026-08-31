import { api } from "@/lib/api";

export type SignupStatusValue = "not_found" | "pending" | "approved" | "rejected";

export type SignupStatusResponse = {
  status: SignupStatusValue;
  detail?: string;
  clinic_name?: string;
  clinic_tin?: string;
  setup_fee_etb?: number;
  rejection_reason?: string;
};

export async function fetchSignupStatus(username: string): Promise<SignupStatusResponse> {
  const { data } = await api.get<SignupStatusResponse>("/billing/signup-status/", {
    params: { username: username.trim() },
  });
  return data;
}

export type ResubmitSetupPaymentPayload = {
  username: string;
  payment_channel: string;
  payment_transaction_ref: string;
};

/** Resubmit setup payment proof after Apex rejection (public endpoint). */
export async function resubmitSetupPayment(payload: ResubmitSetupPaymentPayload) {
  const { data } = await api.post<SignupStatusResponse>(
    "/billing/resubmit-setup/",
    payload,
  );
  return data;
}
