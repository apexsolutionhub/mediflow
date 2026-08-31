import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type SignupStep = {
  label: string;
  title: string;
  description: string;
};

export function SignupStepper({
  steps,
  current,
}: {
  steps: readonly SignupStep[];
  current: number;
}) {
  return (
    <ol
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.label} className="min-w-0 space-y-2">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  done && "bg-primary text-primary-foreground",
                  active && "scale-110 bg-primary/15 text-primary ring-1 ring-primary/40",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium transition-colors duration-300",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            <div
              className={cn(
                "h-0.5 w-full rounded-full transition-colors duration-500",
                done || active ? "bg-primary/50" : "bg-border",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
