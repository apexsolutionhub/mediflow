"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Second line under the label, also searchable. */
  description?: string;
  /** Extra words that should match when searching. */
  keywords?: string;
  /** Custom row content (the label is still used for search and the default trigger). */
  content?: React.ReactNode;
  disabled?: boolean;
};

type ComboboxProps = {
  value: string | undefined | null;
  onValueChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  /** Classes for the trigger button. */
  className?: string;
  /** Classes for the dropdown panel. */
  contentClassName?: string;
  align?: "start" | "center" | "end";
  /** Replace the default selected-value display in the trigger. */
  renderValue?: (selected: ComboboxOption | undefined) => React.ReactNode;
  /** Hide the search box for very short lists. Default: shown when there are more than 6 options. */
  searchable?: boolean;
};

/**
 * Searchable select used everywhere in place of the plain dropdown: a button that opens a
 * popover with a type-to-filter list.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches found.",
  disabled,
  id,
  className,
  contentClassName,
  align = "start",
  renderValue,
  searchable,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === (value ?? ""));
  const showSearch = searchable ?? options.length > 6;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={rest["aria-invalid"]}
          disabled={disabled}
          data-state={open ? "open" : "closed"}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-primary/15 bg-white px-3 text-left text-sm shadow-xs transition-colors outline-none",
            "hover:border-primary/25 focus-visible:border-(--role)/50 focus-visible:ring-3 focus-visible:ring-(--role)/20",
            "data-[state=open]:border-(--role)/45 data-[state=open]:ring-2 data-[state=open]:ring-(--role)/20",
            "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-400",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {renderValue ? renderValue(selected) : (selected?.label ?? placeholder)}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-(--radix-popover-trigger-width) min-w-56 gap-0 rounded-2xl p-0", contentClassName)}
      >
        <Command className="rounded-2xl!">
          {showSearch ? <CommandInput placeholder={searchPlaceholder} /> : null}
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={`${o.label} ${o.description ?? ""} ${o.keywords ?? ""} ${o.value}`}
                disabled={o.disabled}
                onSelect={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className="rounded-xl py-2"
              >
                <span className="min-w-0 flex-1">
                  {o.content ?? (
                    <>
                      <span className="block truncate">{o.label}</span>
                      {o.description ? (
                        <span className="block truncate text-xs text-muted-foreground">{o.description}</span>
                      ) : null}
                    </>
                  )}
                </span>
                <Check className={cn("size-4 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
