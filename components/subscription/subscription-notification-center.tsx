"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BillingSnapshot } from "@/lib/api";
import {
  buildSubscriptionNotifications,
  subscriptionNotificationSummary,
} from "@/lib/subscription-notifications";
import { cn } from "@/lib/utils";

export function SubscriptionNotificationCenter({
  billing,
  className,
  onNavigate,
}: {
  billing: BillingSnapshot;
  className?: string;
  onNavigate?: () => void;
}) {
  const notifications = useMemo(
    () => buildSubscriptionNotifications(billing),
    [billing],
  );
  if (notifications.length === 0) return null;

  const summary = subscriptionNotificationSummary(notifications);
  const badgeCount = summary.critical + summary.warning;
  const status = billing.period_status;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "relative size-9 shrink-0 cursor-pointer border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20",
            className,
          )}
          aria-label={`Subscription alerts, ${badgeCount} high priority`}
        >
          <ShieldAlert className="size-4 text-rose-300" />
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] border-rose-200/80 p-0"
      >
        <div className="border-b border-rose-200/60 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">Subscription — high priority</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pay via Telebirr or Commercial Bank of Ethiopia, then submit proof on the billing
            portal.
          </p>
        </div>
        <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "space-y-1.5 rounded-lg border px-3 py-2.5",
                n.severity === "critical"
                  ? "border-rose-300/60 bg-rose-50/80"
                  : "border-amber-300/60 bg-amber-50/80",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {n.severity === "critical" ? (
                    <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                  ) : (
                    <CreditCard className="size-4 shrink-0 text-amber-600" />
                  )}
                  <span className="text-sm leading-tight font-semibold">{n.title}</span>
                </div>
                <Badge
                  variant={n.severity === "critical" ? "destructive" : "secondary"}
                  className="shrink-0 text-[10px] uppercase"
                >
                  {n.severity}
                </Badge>
              </div>
              <p className="pl-6 text-xs leading-relaxed text-pretty text-muted-foreground">
                {n.message}
              </p>
            </li>
          ))}
        </ul>
        {status === "trial_ending" || status === "trial_expired" ? (
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            Submit the setup fee to Apex. Once approved, your subscription activates and all staff
            can log in.
          </p>
        ) : status === "grace" || status === "warning" ? (
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            After Apex approves your quarterly payment, access continues for the next 90-day quarter.
          </p>
        ) : null}
        <div className="border-t p-3">
          <Button asChild className="h-10 w-full cursor-pointer rounded-xl">
            <Link href="/billing" onClick={onNavigate}>
              Open billing portal
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
