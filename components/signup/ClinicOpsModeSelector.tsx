"use client";

import { Cloud, HardDrive } from "lucide-react";

import {
  CLINIC_OPS_MODE_DESCRIPTIONS,
  CLINIC_OPS_MODE_LABELS,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ClinicOpsMode; icon: typeof Cloud }[] = [
  { value: "online", icon: Cloud },
  { value: "offline", icon: HardDrive },
];

export function ClinicOpsModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ClinicOpsMode;
  onChange: (next: ClinicOpsMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {CLINIC_OPS_MODE_LABELS[option.value]}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {CLINIC_OPS_MODE_DESCRIPTIONS[option.value]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
