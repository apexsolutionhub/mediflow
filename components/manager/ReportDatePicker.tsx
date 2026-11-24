"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarDays, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Picks the day a report is anchored on. The period selector then decides how wide the
 * window around that day is (the day itself, its month, quarter, half-year or year).
 * `undefined` means "today".
 */
export function ReportDatePicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: Date | undefined;
  onChange: (day: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const picked = Boolean(value);

  const choose = (day: Date | undefined) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex items-center gap-1.5", className)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-11 flex-1 justify-start gap-2 rounded-xl bg-white px-3 font-normal shadow-sm",
              picked && "border-(--role)/50 bg-(--role)/8 text-primary",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ? format(value, "EEE, MMM d, yyyy") : "Today"}</span>
          </Button>
        </PopoverTrigger>
        {picked ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-xl bg-white"
            onClick={() => onChange(undefined)}
            disabled={disabled}
          >
            <X className="size-4" />
            <span className="sr-only">Back to today</span>
          </Button>
        ) : null}
      </div>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <Calendar
          mode="single"
          selected={value ?? new Date()}
          onSelect={(day) => day && choose(day)}
          defaultMonth={value ?? new Date()}
          disabled={{ after: new Date() }}
          captionLayout="dropdown"
          className="p-3"
        />
        <div className="flex items-center justify-between gap-2 border-t border-primary/10 px-3 py-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => choose(undefined)}>
            Today
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => choose(subDays(new Date(), 1))}>
            Yesterday
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
