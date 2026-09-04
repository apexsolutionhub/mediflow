import type { DashboardStats } from "@/lib/clinic";
import { isClinicNotificationUnread } from "@/lib/clinic-notification-seen";

export type ClinicNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  severity: "warning" | "info";
};

type RoleKey = "manager" | "reception" | "doctor" | "nurse" | "lab" | "pharmacist" | string;

function pushIf(
  list: ClinicNotification[],
  condition: boolean,
  notification: ClinicNotification,
) {
  if (condition) list.push(notification);
}

export function buildClinicNotifications(
  stats: Partial<DashboardStats>,
  role: RoleKey,
): ClinicNotification[] {
  const normalized = (role || "").toLowerCase();
  const notifications: ClinicNotification[] = [];

  if (normalized === "manager" || normalized === "reception") {
    pushIf(notifications, Number(stats.pending_payments || 0) > 0, {
      id: "pending-payments",
      title: "Pending payments",
      description: `${stats.pending_payments} visit${stats.pending_payments === 1 ? "" : "s"} awaiting payment`,
      href: normalized === "manager" ? "/manager" : "/reception",
      count: Number(stats.pending_payments || 0),
      severity: "warning",
    });
  }

  if (["manager", "reception", "doctor", "nurse"].includes(normalized)) {
    pushIf(notifications, Number(stats.open_encounters || 0) > 0, {
      id: "open-encounters",
      title: "Open encounters",
      description: `${stats.open_encounters} patient visit${stats.open_encounters === 1 ? "" : "s"} in progress`,
      href:
        normalized === "doctor"
          ? "/doctor"
          : normalized === "nurse"
            ? "/nurse"
            : normalized === "reception"
              ? "/reception"
              : "/manager",
      count: Number(stats.open_encounters || 0),
      severity: "info",
    });
  }

  if (normalized === "doctor") {
    pushIf(notifications, Number(stats.results_ready || 0) > 0, {
      id: "results-ready",
      title: "Results ready",
      description: `${stats.results_ready} lab/radiology report${stats.results_ready === 1 ? "" : "s"} awaiting review`,
      href: "/doctor/results",
      count: Number(stats.results_ready || 0),
      severity: "warning",
    });
  }

  if (normalized === "manager" || normalized === "lab") {
    pushIf(notifications, Number(stats.lab_queue || 0) > 0, {
      id: "lab-queue",
      title: "Lab queue",
      description: `${stats.lab_queue} order${stats.lab_queue === 1 ? "" : "s"} waiting`,
      href: "/lab",
      count: Number(stats.lab_queue || 0),
      severity: "warning",
    });
  }

  if (normalized === "manager" || normalized === "radiology") {
    pushIf(notifications, Number(stats.radiology_queue || 0) > 0, {
      id: "radiology-queue",
      title: "Radiology queue",
      description: `${stats.radiology_queue} order${stats.radiology_queue === 1 ? "" : "s"} waiting`,
      href: "/radiology",
      count: Number(stats.radiology_queue || 0),
      severity: "warning",
    });
  }

  if (normalized === "manager" || normalized === "pharmacist") {
    pushIf(notifications, Number(stats.rx_queue || 0) > 0, {
      id: "rx-queue",
      title: "Pharmacy queue",
      description: `${stats.rx_queue} prescription${stats.rx_queue === 1 ? "" : "s"} waiting`,
      href: "/pharmacy",
      count: Number(stats.rx_queue || 0),
      severity: "warning",
    });
  }

  if (normalized === "manager") {
    pushIf(notifications, Number(stats.low_stock || 0) > 0, {
      id: "low-stock",
      title: "Low stock",
      description: `${stats.low_stock} medicine${stats.low_stock === 1 ? "" : "s"} below threshold`,
      href: "/manager/inventory",
      count: Number(stats.low_stock || 0),
      severity: "warning",
    });

    pushIf(notifications, Number(stats.open_tickets || 0) > 0, {
      id: "open-tickets",
      title: "Open tickets",
      description: `${stats.open_tickets} equipment request${stats.open_tickets === 1 ? "" : "s"} open`,
      href: "/manager/requests",
      count: Number(stats.open_tickets || 0),
      severity: "info",
    });
  }

  return notifications;
}

export function clinicNotificationBadgeCount(
  notifications: ClinicNotification[],
  seen: Record<string, number> = {},
): number {
  return notifications.reduce((sum, notification) => {
    if (!isClinicNotificationUnread(notification.id, notification.count, seen)) return sum;
    return sum + notification.count;
  }, 0);
}

export function isNotificationUnread(
  notification: ClinicNotification,
  seen: Record<string, number>,
): boolean {
  return isClinicNotificationUnread(notification.id, notification.count, seen);
}
