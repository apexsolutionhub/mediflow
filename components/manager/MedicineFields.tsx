"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { format, parse } from "date-fns";
import { AlertTriangle, CalendarDays, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  draftErrorsAreEmpty,
  isPastDate,
  lineCredit,
  lineTotal,
  receivedFor,
  type DraftErrors,
  type MedicineDraft,
} from "@/components/manager/medicine-draft";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  LOOSE_UNIT_OPTIONS,
  MEDICINE_CATEGORIES,
  MEDICINE_UNITS,
  money,
  type Medicine,
  type Supplier,
} from "@/lib/clinic";
import { cn } from "@/lib/utils";

const controlClass = "h-10 rounded-xl border-primary/15 bg-white text-sm shadow-xs";

export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-[11px] font-semibold tracking-wide text-primary/80">{label}</label>
      {children}
      {error ? (
        <p className="text-[11px] font-semibold text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function PickSelect({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <Combobox
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      searchable={options.length > 5}
      className={cn(controlClass, invalid && "border-rose-400")}
    />
  );
}

/** Expiry date chosen from a calendar popover; value is "YYYY-MM-DD" or "". */
function ExpiryPicker({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? parse(value.slice(0, 10), "yyyy-MM-dd", new Date()) : undefined;
  const valid = date && !Number.isNaN(date.getTime()) ? date : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1.5">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              controlClass,
              "flex-1 justify-start gap-2 px-3 font-normal",
              !valid && "text-muted-foreground",
              invalid && "border-rose-400",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{valid ? format(valid, "MMM d, yyyy") : "Pick a date"}</span>
          </Button>
        </PopoverTrigger>
        {valid ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-xl bg-white"
            disabled={disabled}
            onClick={() => onChange("")}
          >
            <X className="size-4" />
            <span className="sr-only">Clear expiry date</span>
          </Button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <Calendar
          mode="single"
          selected={valid}
          defaultMonth={valid ?? new Date()}
          onSelect={(day) => {
            if (!day) return;
            onChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 1, 0)}
          endMonth={new Date(new Date().getFullYear() + 15, 11)}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

/** Photo of the medicine, uploaded to Cloudinary (optional). */
function ImageField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const canUpload = isCloudinaryConfigured();

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setBusy(true);
    try {
      onChange(await uploadImageToCloudinary(file, { folder: "mediflow/medicines" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="w-full">
      {value ? (
        <div className="relative h-24 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Medicine" className="size-full rounded-xl border bg-white object-contain" />
          <button
            type="button"
            aria-label="Remove image"
            className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-rose-600 text-white"
            onClick={() => onChange("")}
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy || !canUpload}
          onClick={() => ref.current?.click()}
          className="inline-flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-(--role)/40 bg-white text-xs text-primary/70 transition-colors hover:bg-(--role)/8 disabled:opacity-50"
        >
          <ImagePlus className="size-5" />
          {busy ? "Uploading…" : "Add photo"}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {!canUpload ? (
        <p className="text-xs text-muted-foreground">Photo upload is not configured.</p>
      ) : null}
    </div>
  );
}

/** "Also sell loose" panel: a pack holds N loose units (tablets...). */
function PackSellingPanel({
  draft,
  onChange,
  errors,
  disabled,
}: {
  draft: MedicineDraft;
  onChange: (patch: Partial<MedicineDraft>) => void;
  errors: DraftErrors;
  disabled?: boolean;
}) {
  const size = Math.floor(Number(draft.pack_size)) || 0;
  const packPrice = Number(draft.unit_price) || 0;
  const cost = Number(draft.cost) || 0;
  const looseWord = LOOSE_UNIT_OPTIONS.find((u) => u.value === draft.loose_unit)?.label.toLowerCase() ?? "unit";
  const derived = size > 1 ? Math.round((packPrice / size) * 100) / 100 : 0;
  const chosen = draft.loose_price.trim() !== "" ? Number(draft.loose_price) : derived;
  const costPerLoose = size > 1 ? cost / size : 0;
  const underCost = size > 1 && cost > 0 && chosen > 0 && chosen < costPerLoose - 0.0001;

  return (
    <div className="rounded-2xl border border-(--role)/20 bg-(--role)/4 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Also sell loose</p>
          <p className="text-xs text-muted-foreground">
            Let one pack be sold by the single {looseWord} (strips, bottles, boxes…).
          </p>
        </div>
        <Switch
          checked={draft.split}
          disabled={disabled}
          aria-label="Sell loose"
          onCheckedChange={(on) =>
            onChange({
              split: on,
              pack_size: on && !draft.pack_size ? "10" : draft.pack_size,
              loose_unit: draft.loose_unit || "tablet",
            })
          }
        />
      </div>
      {draft.split ? (
        <div className="@container mt-3">
          <div className="grid gap-3 @md:grid-cols-3">
            <Field label="Units in one pack" error={errors.pack_size}>
              <Input
                type="number"
                min={2}
                inputMode="numeric"
                value={draft.pack_size}
                disabled={disabled}
                onChange={(e) => onChange({ pack_size: e.target.value })}
                className={controlClass}
              />
            </Field>
            <Field label="Loose unit">
              <PickSelect
                value={draft.loose_unit}
                onChange={(v) => onChange({ loose_unit: v })}
                options={LOOSE_UNIT_OPTIONS}
                placeholder="Unit"
                disabled={disabled}
              />
            </Field>
            <Field
              label="Loose price (ETB)"
              error={errors.loose_price}
              hint={
                size > 1
                  ? `${draft.loose_price.trim() === "" ? "Pack price ÷ size: " : ""}${money(chosen)} ETB per ${looseWord}`
                  : undefined
              }
            >
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder={derived ? String(derived) : "Optional"}
                value={draft.loose_price}
                disabled={disabled}
                onChange={(e) => onChange({ loose_price: e.target.value })}
                className={controlClass}
              />
            </Field>
          </div>
          {underCost ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="size-3.5" />
              Below cost: one {looseWord} costs {money(costPerLoose)} ETB.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Every field of a medicine registration, in one place.
 * Used by the intake form (one per line) and by the edit dialog.
 */
export function MedicineFields({
  draft,
  onChange,
  errors,
  suppliers,
  original,
  mode,
  disabled,
}: {
  draft: MedicineDraft;
  onChange: (patch: Partial<MedicineDraft>) => void;
  errors: DraftErrors;
  suppliers: Supplier[];
  original?: Medicine | null;
  mode: "intake" | "edit";
  disabled?: boolean;
}) {
  const total = lineTotal(draft, original);
  const credit = lineCredit(draft, original);
  const received = receivedFor(draft, original);
  const past = isPastDate(draft.expiry_date);

  return (
    <div className="@container space-y-4">
      <div className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
        <Field label="Medicine name" error={errors.name}>
          <Input
            placeholder="e.g. Paracetamol 500mg"
            value={draft.name}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn(controlClass, errors.name && "border-rose-400")}
          />
        </Field>

        <Field label="Category" error={errors.category}>
          <PickSelect
            value={draft.category}
            onChange={(v) => onChange({ category: v })}
            options={MEDICINE_CATEGORIES}
            placeholder="Select category"
            invalid={Boolean(errors.category)}
            disabled={disabled}
          />
        </Field>

        <Field label="Supplier" error={errors.supplier_id}>
          <div className="space-y-1.5">
            <PickSelect
              value={draft.supplier_id}
              onChange={(v) => onChange({ supplier_id: v })}
              options={suppliers.map((s) => ({ label: s.supplier_name, value: String(s.id) }))}
              placeholder={suppliers.length ? "Select supplier" : "No suppliers yet"}
              invalid={Boolean(errors.supplier_id)}
              disabled={disabled || !suppliers.length}
            />
            {!suppliers.length ? (
              <Link href="/manager/suppliers" className="text-xs font-semibold text-(--role) underline-offset-2 hover:underline">
                Add a supplier first →
              </Link>
            ) : null}
          </div>
        </Field>

        <Field label="Sale price (ETB)" error={errors.unit_price} hint="Price of one whole pack">
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            value={draft.unit_price}
            disabled={disabled}
            onChange={(e) => onChange({ unit_price: e.target.value })}
            className={cn(controlClass, errors.unit_price && "border-rose-400")}
          />
        </Field>

        <Field label="Cost price (ETB)" error={errors.cost} hint="What you paid per pack">
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            value={draft.cost}
            disabled={disabled}
            onChange={(e) => onChange({ cost: e.target.value })}
            className={cn(controlClass, errors.cost && "border-rose-400")}
          />
        </Field>

        <Field label="Quantity & unit" error={errors.on_hand || errors.unit_of_measure}>
          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={draft.on_hand}
              disabled={disabled}
              onChange={(e) => onChange({ on_hand: e.target.value })}
              className={cn(controlClass, errors.on_hand && "border-rose-400")}
            />
            <PickSelect
              value={draft.unit_of_measure}
              onChange={(v) => onChange({ unit_of_measure: v })}
              options={MEDICINE_UNITS}
              placeholder="Unit"
              invalid={Boolean(errors.unit_of_measure)}
              disabled={disabled}
            />
          </div>
        </Field>

        <Field label="Batch number" error={errors.batch_number}>
          <Input
            placeholder="e.g. BATCH-2026-X"
            value={draft.batch_number}
            disabled={disabled}
            onChange={(e) => onChange({ batch_number: e.target.value })}
            className={cn(controlClass, errors.batch_number && "border-rose-400")}
          />
        </Field>

        <Field
          label="Expiry date"
          error={errors.expiry_date}
          hint={past ? <span className="font-semibold text-amber-700">This date has already passed.</span> : "Optional"}
        >
          <ExpiryPicker
            value={draft.expiry_date}
            onChange={(v) => onChange({ expiry_date: v })}
            disabled={disabled}
            invalid={Boolean(errors.expiry_date)}
          />
        </Field>

        <Field
          label="Paid amount (ETB)"
          error={errors.paid_amount}
          hint={
            total > 0 ? (
              credit > 0.005 ? (
                <span className="font-semibold text-rose-600">On credit · {money(credit)} ETB still to pay</span>
              ) : (
                <span className="font-semibold text-emerald-700">Fully paid</span>
              )
            ) : (
              "Fills in once you enter cost and quantity"
            )
          }
        >
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            value={draft.paid_touched ? draft.paid_amount : total ? String(Math.round(total * 100) / 100) : ""}
            disabled={disabled}
            onChange={(e) => onChange({ paid_amount: e.target.value, paid_touched: true })}
            className={cn(controlClass, errors.paid_amount && "border-rose-400")}
          />
        </Field>
      </div>

      {total > 0 ? (
        <p className="text-xs text-muted-foreground">
          Total cost <span className="font-semibold text-primary">{money(total)} ETB</span> ({received} received × {money(Number(draft.cost) || 0)})
        </p>
      ) : null}

      <PackSellingPanel draft={draft} onChange={onChange} errors={errors} disabled={disabled} />

      <div className="grid gap-3 @lg:grid-cols-2">
        <Field label="Description" hint="Optional: strength, form, or dispensing notes">
          <Textarea
            value={draft.description}
            disabled={disabled}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Describe this medicine…"
            className="min-h-24 rounded-xl border-primary/15 bg-white text-sm shadow-xs"
          />
        </Field>
        <Field label="Medicine image">
          <ImageField value={draft.image_url} onChange={(url) => onChange({ image_url: url })} disabled={disabled} />
        </Field>
      </div>

      <div className="grid gap-3 @md:grid-cols-2">
        <Field label="Low-stock alert at (packs)" hint="Raises a low-stock alert when whole packs fall to this number">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.min_threshold}
            disabled={disabled}
            onChange={(e) => onChange({ min_threshold: e.target.value })}
            className={controlClass}
          />
        </Field>
      </div>

      {!draftErrorsAreEmpty(errors) ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle className="size-3.5" />
          Fix the highlighted fields to continue.
        </p>
      ) : null}
    </div>
  );
}
