export type ClinicNotificationSeenMap = Record<string, number>;

export function clinicNotificationSeenKey(role: string, username?: string): string {
  const base = `mediflow-clinic-notif-seen:${(role || "staff").toLowerCase()}`;
  const user = username?.trim();
  return user ? `${base}:${user}` : base;
}

export function readClinicNotificationSeen(key: string): ClinicNotificationSeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ClinicNotificationSeenMap = {};
    for (const [id, count] of Object.entries(parsed)) {
      if (typeof count === "number" && Number.isFinite(count)) out[id] = count;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeClinicNotificationSeen(
  key: string,
  seen: ClinicNotificationSeenMap,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(seen));
  } catch {
    // ignore quota / private mode
  }
}

export function isClinicNotificationUnread(
  notificationId: string,
  currentCount: number,
  seen: ClinicNotificationSeenMap,
): boolean {
  const seenAt = seen[notificationId];
  if (seenAt === undefined) return true;
  return currentCount > seenAt;
}
