import type { BillingSnapshot, ClinicUser, PendingPaymentSubmission } from "@/lib/api";
import { ROLE_HOME } from "@/lib/api";
import {
  getSubscriptionPaymentGate,
  isClinicBillingActive,
} from "@/lib/billing-access";
import type { SignupStatusResponse } from "@/lib/signup-api";

export type LoginPayload = {
  access: string;
  refresh?: string;
  user: ClinicUser;
  access_mode: string;
  billing: BillingSnapshot;
  pending_submission?: PendingPaymentSubmission | null;
};

export type LoginAccessDecision =
  | {
      allowed: true;
      destination: string;
      accessMode: string;
    }
  | {
      allowed: false;
      code:
        | "inactive"
        | "account_suspended"
        | "setup_pending"
        | "setup_rejected"
        | "quarterly_pending"
        | "quarterly_rejected"
        | "not_approved";
      message: string;
      username?: string;
      signupStatus?: SignupStatusResponse;
      rejectionReason?: string;
    };

export function evaluateLoginAccess(payload: LoginPayload): LoginAccessDecision {
  const user = payload.user;
  const billing = payload.billing;
  const role = String(user?.role || "").toLowerCase();

  if (user?.is_active === false) {
    return {
      allowed: false,
      code: "inactive",
      message: "This account is inactive. Contact your clinic manager or Apex support.",
      username: user.username,
    };
  }

  const accountStatus = String(billing?.account_status || "active").toLowerCase();
  if (accountStatus !== "active") {
    return {
      allowed: false,
      code: "account_suspended",
      message:
        accountStatus === "banned"
          ? "This clinic account has been banned."
          : "This clinic account is suspended. Contact Apex support.",
      username: user.username,
    };
  }

  if (!billing?.setup_fee_approved) {
    return {
      allowed: false,
      code: "setup_pending",
      message:
        "Your clinic setup payment is not approved yet. Sign-in is disabled until Apex verifies your transfer.",
      username: user.username,
    };
  }

  if (billing.period_status === "setup_pending") {
    return {
      allowed: false,
      code: "setup_pending",
      message:
        "Your setup payment is awaiting Apex approval. Sign-in stays disabled until verification completes.",
      username: user.username,
    };
  }

  const subscriptionGate = getSubscriptionPaymentGate(billing, payload.pending_submission);
  if (subscriptionGate.blocked) {
    return {
      allowed: false,
      code:
        subscriptionGate.phase === "rejected" ? "quarterly_rejected" : "quarterly_pending",
      message: subscriptionGate.message,
      username: user.username,
      rejectionReason: subscriptionGate.rejectionReason,
    };
  }

  if (payload.access_mode === "payment_portal") {
    return {
      allowed: true,
      destination: "/billing",
      accessMode: "payment_portal",
    };
  }

  return {
    allowed: true,
    destination: ROLE_HOME[role] || "/manager",
    accessMode: payload.access_mode || "full",
  };
}

export function loginDecisionFromSignupStatus(
  username: string,
  status: SignupStatusResponse,
): LoginAccessDecision {
  if (status.status === "approved") {
    return {
      allowed: true,
      destination: "/",
      accessMode: "full",
    };
  }
  if (status.status === "rejected") {
    return {
      allowed: false,
      code: "setup_rejected",
      message:
        status.rejection_reason?.trim() ||
        "Your setup payment was rejected. Update your transfer details on the signup page and resubmit.",
      username,
      signupStatus: status,
    };
  }
  if (status.status === "pending") {
    return {
      allowed: false,
      code: "setup_pending",
      message:
        "Your clinic is awaiting Apex approval. Sign-in stays disabled until your setup payment is verified.",
      username,
      signupStatus: status,
    };
  }
  return {
    allowed: false,
    code: "not_approved",
    message: "Registration not found. Complete clinic signup first.",
    username,
    signupStatus: status,
  };
}

export function isClinicSessionAllowed(
  billing: BillingSnapshot | null,
  user: ClinicUser | null,
  pendingSubmission?: PendingPaymentSubmission | null,
): boolean {
  if (!user || user.is_active === false) return false;
  if (!billing) return false;
  const accountStatus = String(billing.account_status || "active").toLowerCase();
  if (accountStatus !== "active") return false;
  return isClinicBillingActive(billing, pendingSubmission);
}

export function renewalGatePath(username: string): string {
  return `/billing/renewal?username=${encodeURIComponent(username)}`;
}

export function signupGatePath(username: string): string {
  return `/signup?username=${encodeURIComponent(username)}`;
}

export function gatePathForLoginDecision(
  decision: Extract<LoginAccessDecision, { allowed: false }>,
): string {
  if (
    decision.code === "quarterly_pending" ||
    decision.code === "quarterly_rejected"
  ) {
    return renewalGatePath(decision.username || "");
  }
  if (decision.code === "setup_pending" || decision.code === "setup_rejected") {
    return signupGatePath(decision.username || "");
  }
  return "/";
}
