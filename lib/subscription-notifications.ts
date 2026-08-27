import type { BillingSnapshot } from "@/lib/api";
import { money } from "@/lib/clinic";

export type SubscriptionNotification = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  message: string;
  status: string;
};

const PAYMENT_CHANNELS = "Telebirr or Commercial Bank of Ethiopia";

function formatDueDate(value?: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function subscriptionNotificationSummary(notifications: SubscriptionNotification[]): {
  critical: number;
  warning: number;
} {
  let critical = 0;
  let warning = 0;
  for (const n of notifications) {
    if (n.severity === "critical") critical += 1;
    else warning += 1;
  }
  return { critical, warning };
}

export function buildSubscriptionNotifications(
  billing: BillingSnapshot,
): SubscriptionNotification[] {
  const status = billing.period_status;
  const daysLeft = billing.days_until_due;
  const dueLabel = formatDueDate(billing.due_at);
  const quarterly = money(billing.quarterly_fee_etb || 0);
  const setup = money(billing.setup_fee_etb || 0);

  if (
    status === "exempt" ||
    status === "on_hold" ||
    status === "trial" ||
    status === "active"
  ) {
    return [];
  }

  if (status === "trial_ending") {
    const d = daysLeft ?? 0;
    return [
      {
        id: "trial-ending",
        severity: "warning",
        status,
        title: `Free trial ends in ${d} day${d === 1 ? "" : "s"}`,
        message: `Submit the setup fee (${setup} ETB) via ${PAYMENT_CHANNELS} before ${dueLabel || "the trial ends"}. After the due date, staff sign-in is disabled until Apex verifies payment.`,
      },
    ];
  }

  if (status === "trial_expired") {
    return [
      {
        id: "trial-expired",
        severity: "critical",
        status,
        title: "Free trial ended — setup payment required",
        message: `Submit the setup fee (${setup} ETB) on the payment portal. Staff cannot sign in until Apex approves your payment.`,
      },
    ];
  }

  if (status === "setup_pending") {
    return [
      {
        id: "setup-pending",
        severity: "critical",
        status,
        title: "Setup fee awaiting Apex approval",
        message: "Your setup payment is being verified. Sign-in stays limited until Apex approves (usually within about 30 minutes).",
      },
    ];
  }

  if (status === "warning") {
    const d = daysLeft ?? 0;
    return [
      {
        id: "quarter-warning",
        severity: "warning",
        status,
        title: "Quarterly subscription ending soon",
        message: `Your paid quarter ends ${dueLabel || "soon"} (${d} day${d === 1 ? "" : "s"} left). Submit ${quarterly} ETB via ${PAYMENT_CHANNELS} before the due date to avoid staff lockout.`,
      },
    ];
  }

  if (status === "grace") {
    const d = daysLeft != null ? Math.abs(daysLeft) : 0;
    return [
      {
        id: "quarter-grace",
        severity: "critical",
        status,
        title: "Subscription grace period — renew now",
        message: `Quarter ended ${dueLabel || "recently"}. Pay ${quarterly} ETB on the payment portal — staff login is disabled until Apex approves your renewal.`,
      },
    ];
  }

  if (status === "expired") {
    return [
      {
        id: "quarter-expired",
        severity: "critical",
        status,
        title: "Subscription expired",
        message: `Quarterly payment was not received in time. Pay ${quarterly} ETB via ${PAYMENT_CHANNELS} — all staff logins stay disabled until Apex approves.`,
      },
    ];
  }

  return [];
}

export function shouldShowTrialBillingButton(billing: BillingSnapshot | null | undefined): boolean {
  return billing?.period_status === "trial_ending";
}

export function shouldShowSubscriptionNotifications(
  billing: BillingSnapshot | null | undefined,
): boolean {
  if (!billing) return false;
  return buildSubscriptionNotifications(billing).length > 0;
}
