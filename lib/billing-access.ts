import type { BillingSnapshot } from "@/lib/api";
import { isIllustrationBilling } from "@/lib/tenant-demo";
import { isApexProvisionedBilling } from "@/lib/tenantProvisioning";

export type PendingPaymentSubmission = {
  payment_kind?: string;
  status?: string;
  rejection_reason?: string;
  transaction_ref?: string;
};

export type SubscriptionPaymentGate =
  | { blocked: false }
  | {
      blocked: true;
      phase: "pending" | "rejected";
      message: string;
      rejectionReason?: string;
    };

function quarterlyBillingApplies(billing: BillingSnapshot): boolean {
  return Number(billing.quarterly_fee_etb || 0) > 0;
}

/** Setup approved but latest quarterly payment is awaiting Apex or was rejected. */
export function getSubscriptionPaymentGate(
  billing: BillingSnapshot | null | undefined,
  pendingSubmission?: PendingPaymentSubmission | null,
): SubscriptionPaymentGate {
  if (isIllustrationBilling(billing)) {
    return { blocked: false };
  }

  if (isApexProvisionedBilling(billing)) {
    return { blocked: false };
  }

  if (!billing?.setup_fee_approved || !quarterlyBillingApplies(billing)) {
    return { blocked: false };
  }

  if (billing.subscription_payment_approved !== false) {
    return { blocked: false };
  }

  const pendingKind = String(pendingSubmission?.payment_kind || "").toLowerCase();
  const pendingStatus = String(pendingSubmission?.status || "").toLowerCase();
  const rejectionReason =
    pendingSubmission?.rejection_reason?.trim() ||
    billing.subscription_rejection_reason?.trim() ||
    undefined;

  if (pendingKind === "quarterly" && pendingStatus === "pending") {
    return {
      blocked: true,
      phase: "pending",
      message:
        "Your quarterly renewal is awaiting Apex approval. Sign-in stays disabled until your transfer is verified.",
      rejectionReason,
    };
  }

  if (rejectionReason || pendingStatus === "rejected") {
    return {
      blocked: true,
      phase: "rejected",
      message:
        rejectionReason ||
        "Your quarterly payment was rejected. Update your transfer details and resubmit — sign-in stays disabled until Apex approves.",
      rejectionReason,
    };
  }

  const hasProof = Boolean((billing.payment_transaction_ref || "").trim().length >= 4);
  if (hasProof) {
    return {
      blocked: true,
      phase: "rejected",
      message:
        "Your quarterly payment was rejected or needs correction. Resubmit payment proof below — sign-in stays disabled until Apex approves.",
      rejectionReason,
    };
  }

  return {
    blocked: true,
    phase: "pending",
    message:
      "Your quarterly renewal is awaiting Apex approval. Sign-in stays disabled until your transfer is verified.",
    rejectionReason,
  };
}

export function isSubscriptionPaymentBlocking(
  billing: BillingSnapshot | null | undefined,
  pendingSubmission?: PendingPaymentSubmission | null,
): boolean {
  return getSubscriptionPaymentGate(billing, pendingSubmission).blocked;
}

/** Full clinic access (not billing-only portal). */
export function isClinicBillingActive(
  billing: BillingSnapshot | null | undefined,
  pendingSubmission?: PendingPaymentSubmission | null,
): boolean {
  if (billing?.billing_hold || billing?.period_status === "on_hold") return false;
  if (isIllustrationBilling(billing) || isApexProvisionedBilling(billing)) return true;
  if (!billing?.setup_fee_approved) return false;
  if (isSubscriptionPaymentBlocking(billing, pendingSubmission)) return false;
  return true;
}
