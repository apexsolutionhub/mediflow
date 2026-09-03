"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Beaker, Check, ClipboardList, Pill, Wallet, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api, readUser } from "@/lib/api";
import {
  clinicNotificationSeenKey,
  readClinicNotificationSeen,
  writeClinicNotificationSeen,
  type ClinicNotificationSeenMap,
} from "@/lib/clinic-notification-seen";
import {
  buildClinicNotifications,
  clinicNotificationBadgeCount,
  isNotificationUnread,
  type ClinicNotification,
} from "@/lib/clinic-notifications";
import type { DashboardStats } from "@/lib/clinic";
import { cn } from "@/lib/utils";

function NotificationIcon({ notification }: { notification: ClinicNotification }) {
  if (notification.id === "pending-payments") return <Wallet className="size-4 shrink-0" />;
  if (notification.id === "lab-queue") return <Beaker className="size-4 shrink-0" />;
  if (notification.id === "rx-queue") return <Pill className="size-4 shrink-0" />;
  if (notification.id === "open-tickets") return <Wrench className="size-4 shrink-0" />;
  return <ClipboardList className="size-4 shrink-0" />;
}

export function ClinicNotificationCenter({
  role,
  className,
  onNavigate,
}: {
  role: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const storageKey = useMemo(() => {
    const user = readUser();
    return clinicNotificationSeenKey(role, user?.username);
  }, [role]);

  const [stats, setStats] = useState<Partial<DashboardStats>>({});
  const [seen, setSeen] = useState<ClinicNotificationSeenMap>(() =>
    readClinicNotificationSeen(clinicNotificationSeenKey(role, readUser()?.username)),
  );

  useEffect(() => {
    setSeen(readClinicNotificationSeen(storageKey));
  }, [storageKey]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardStats>("/clinic/dashboard/");
      setStats(data);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const notifications = useMemo(
    () => buildClinicNotifications(stats, role),
    [role, stats],
  );
  const badgeCount = clinicNotificationBadgeCount(notifications, seen);
  const hasUnread = notifications.some((notification) => isNotificationUnread(notification, seen));

  const markRead = useCallback(
    (notification: ClinicNotification) => {
      setSeen((prev) => {
        const next = { ...prev, [notification.id]: notification.count };
        writeClinicNotificationSeen(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const markAllRead = useCallback(() => {
    setSeen((prev) => {
      const next = { ...prev };
      for (const notification of notifications) {
        next[notification.id] = notification.count;
      }
      writeClinicNotificationSeen(storageKey, next);
      return next;
    });
  }, [notifications, storageKey]);

  if (notifications.length === 0) return null;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "relative size-9 shrink-0 cursor-pointer border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                className,
              )}
              aria-label={`Clinic notifications, ${badgeCount} unread`}
            >
              <Bell className="size-4" />
              {badgeCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-apex-navy">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Clinic notifications</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Clinic notifications</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Live workload for your role
            </p>
          </div>
          {hasUnread ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
          {notifications.map((notification) => {
            const unread = isNotificationUnread(notification, seen);
            return (
              <li
                key={notification.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 transition-colors",
                  unread
                    ? notification.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border bg-card/80"
                    : "border-border/60 bg-muted/20 opacity-70",
                )}
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={notification.href}
                    onClick={onNavigate}
                    className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-90"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                        notification.severity === "warning"
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <NotificationIcon notification={notification} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                      {notification.count}
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end">
                    {unread ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => markRead(notification)}
                      >
                        Mark read
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Check className="size-3" />
                        Read
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
