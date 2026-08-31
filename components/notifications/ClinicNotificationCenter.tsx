"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Beaker, ClipboardList, Pill, Wallet, Wrench } from "lucide-react";

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
import { api } from "@/lib/api";
import {
  buildClinicNotifications,
  clinicNotificationBadgeCount,
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
  const [stats, setStats] = useState<Partial<DashboardStats>>({});

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
  const badgeCount = clinicNotificationBadgeCount(notifications);

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
              aria-label={`Clinic notifications, ${badgeCount} items`}
            >
              <Bell className="size-4" />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-apex-navy">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Clinic notifications</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Clinic notifications</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live workload for your role
          </p>
        </div>
        <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                href={notification.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50",
                  notification.severity === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-card/80",
                )}
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
                  <p className="mt-0.5 text-xs text-muted-foreground">{notification.description}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                  {notification.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
