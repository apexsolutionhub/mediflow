"use client";

import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BillingSnapshot } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TrialBillingButton({
  billing,
  className,
  onNavigate,
}: {
  billing: BillingSnapshot;
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  if (billing.period_status !== "trial_ending") return null;

  const daysLeft = billing.days_until_due ?? 0;

  const handleClick = () => {
    onNavigate?.();
    router.push("/billing");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "relative size-9 shrink-0 cursor-pointer border-amber-500/40 bg-amber-500/10 animate-pulse hover:bg-amber-500/20",
            className,
          )}
          aria-label={`Trial ends in ${daysLeft} days — submit setup payment`}
          onClick={handleClick}
        >
          <CreditCard className="size-4 text-amber-400" />
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {daysLeft}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-center">
        <p className="font-semibold">
          Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tap to submit setup payment before the trial expires
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
