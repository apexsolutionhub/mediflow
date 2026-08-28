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
  allowedModes,
  disabledModes,
}: {
  value: ClinicOpsMode;
  onChange: (next: ClinicOpsMode) => void;
  disabled?: boolean;
  /** When set, only these modes are selectable (others hidden). */
  allowedModes?: ClinicOpsMode[];
  /** Modes shown but not selectable (e.g. current mode). */
  disabledModes?: ClinicOpsMode[];
}) {
  const visible = allowedModes?.length
    ? OPTIONS.filter((o) => allowedModes.includes(o.value))
    : OPTIONS;

  return (
    <div className={cn("grid gap-3", visible.length > 1 ? "sm:grid-cols-2" : "")}>
      {visible.map((option) => {
        const optionDisabled = disabled || disabledModes?.includes(option.value);
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            disabled={optionDisabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40",
              optionDisabled && "pointer-events-none opacity-60",
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
