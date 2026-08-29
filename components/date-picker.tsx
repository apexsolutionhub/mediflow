"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function parsePickerDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function timeFromDate(date: Date | undefined, fallback = "09:00"): string {
  if (!date) return fallback;
  return format(date, "HH:mm");
}

function mergeDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const merged = new Date(date);
  merged.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return merged;
}

function buildDisabledMatchers(
  fromDate?: Date,
  toDate?: Date,
  disabledDates?: Matcher | Matcher[],
): Matcher | Matcher[] | undefined {
  const matchers: Matcher[] = [];
  if (fromDate) matchers.push({ before: fromDate });
  if (toDate) matchers.push({ after: toDate });
  if (disabledDates) {
    if (Array.isArray(disabledDates)) matchers.push(...disabledDates);
    else matchers.push(disabledDates);
  }
  if (matchers.length === 0) return undefined;
  if (matchers.length === 1) return matchers[0];
  return matchers;
}

function getPickerMonthRange(fromDate?: Date, yearsAhead = 10) {
  const start = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1) : new Date(new Date().getFullYear(), 0, 1);
  const end = new Date(start.getFullYear() + yearsAhead, 11, 31);
  return { startMonth: start, endMonth: end };
}

function PickerPopoverContent({ children }: { children: React.ReactNode }) {
  return (
    <PopoverContent
      className="w-auto max-h-[min(85vh,32rem)] overflow-y-auto overscroll-contain p-0"
      align="start"
      side="bottom"
      sideOffset={8}
      collisionPadding={16}
    >
      {children}
    </PopoverContent>
  );
}

const pickerCalendarProps = {
  captionLayout: "dropdown" as const,
  navLayout: "after" as const,
  className: "p-3",
};

type PickerBaseProps = {
  value?: Date | string | null;
  onChange?: (value: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  disabledDates?: Matcher | Matcher[];
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  fromDate,
  toDate,
  disabledDates,
}: PickerBaseProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parsePickerDate(value);
  const disabledMatcher = React.useMemo(
    () => buildDisabledMatchers(fromDate, toDate, disabledDates),
    [disabledDates, fromDate, toDate],
  );
  const monthRange = React.useMemo(() => getPickerMonthRange(fromDate), [fromDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl px-3.5 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? format(selected, "PPP") : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PickerPopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(date ?? undefined);
            setOpen(false);
          }}
          disabled={disabledMatcher}
          defaultMonth={selected ?? fromDate ?? monthRange.startMonth}
          startMonth={monthRange.startMonth}
          endMonth={monthRange.endMonth}
          {...pickerCalendarProps}
        />
      </PickerPopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date and time",
  disabled,
  className,
  fromDate,
  toDate,
  disabledDates,
}: PickerBaseProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parsePickerDate(value);
  const [time, setTime] = React.useState(() => timeFromDate(selected));
  const disabledMatcher = React.useMemo(
    () => buildDisabledMatchers(fromDate, toDate, disabledDates),
    [disabledDates, fromDate, toDate],
  );
  const monthRange = React.useMemo(() => getPickerMonthRange(fromDate, 2), [fromDate]);

  React.useEffect(() => {
    setTime(timeFromDate(selected));
  }, [selected]);

  const apply = (date: Date | undefined, nextTime: string) => {
    if (!date) {
      onChange?.(undefined);
      return;
    }
    onChange?.(mergeDateAndTime(date, nextTime));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl px-3.5 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? format(selected, "PPP · p") : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PickerPopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => apply(date, time)}
          disabled={disabledMatcher}
          defaultMonth={selected ?? fromDate ?? monthRange.startMonth}
          startMonth={monthRange.startMonth}
          endMonth={monthRange.endMonth}
          {...pickerCalendarProps}
        />
        <Separator />
        <div className="flex items-center gap-2 p-3">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <div className="grid w-full gap-1.5">
            <Label htmlFor="picker-time" className="text-xs text-muted-foreground">
              Time
            </Label>
            <Input
              id="picker-time"
              type="time"
              value={time}
              disabled={disabled}
              className="h-9 rounded-lg"
              onChange={(event) => {
                const nextTime = event.target.value;
                setTime(nextTime);
                if (selected) apply(selected, nextTime);
              }}
            />
          </div>
        </div>
        <div className="flex justify-end border-t p-2">
          <Button type="button" size="sm" className="rounded-lg" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PickerPopoverContent>
    </Popover>
  );
}
