"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { selectionState } from "@/lib/parallelBatch";

export function BatchLineCard({
  index,
  canRemove,
  onRemove,
  children,
  className,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Line {index + 1}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`Remove line ${index + 1}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

export function BatchAddLineButton({
  onClick,
  label = "Add another line",
  disabled,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-xl border-dashed"
      disabled={disabled}
      onClick={onClick}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}

export function BatchSelectionBar({
  actionableIds,
  selectedIds,
  onSelectedIdsChange,
  selectAllLabel = "Select all open",
  actionLabel,
  onAction,
  actionPending,
  disabled,
}: {
  actionableIds: number[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  selectAllLabel?: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
  actionPending?: boolean;
  disabled?: boolean;
}) {
  const allSelected = selectionState(actionableIds, selectedIds);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Checkbox
          disabled={disabled || actionableIds.length === 0}
          checked={
            allSelected === "indeterminate" ? "indeterminate" : allSelected
          }
          onCheckedChange={(checked) =>
            onSelectedIdsChange(checked === true ? [...actionableIds] : [])
          }
          aria-label={selectAllLabel}
        />
        <span>
          {selectAllLabel}
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : null}
        </span>
      </label>
      <Button
        type="button"
        size="sm"
        className="rounded-xl"
        disabled={disabled || selectedIds.length === 0 || actionPending}
        onClick={() => void onAction()}
      >
        {actionPending ? "Updating…" : `${actionLabel} (${selectedIds.length})`}
      </Button>
    </div>
  );
}

export function BatchField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm leading-none font-medium select-none"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
