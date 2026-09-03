"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Clock3,
  Package,
  Pill,
  Plus,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatusPill,
} from "@/components/ui-chrome";
import { api } from "@/lib/api";
import {
  MEDICINE_FREQUENCY_OPTIONS,
  type Medicine,
  orderTone,
} from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type RxLine = {
  id: string;
  medicineId: number | null;
  medicineName: string;
  inInventory: boolean;
  dose: string;
  frequency: string;
  duration: string;
};

function newLine(): RxLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    medicineId: null,
    medicineName: "",
    inInventory: false,
    dose: "",
    frequency: MEDICINE_FREQUENCY_OPTIONS[0]?.value || "Morning one · Night one",
    duration: "",
  };
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-[11px] font-semibold tracking-[0.14em] text-primary/70 uppercase">
        {children}
      </Label>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function MedicinePicker({
  medicines,
  value,
  inInventory,
  onPickInventory,
  onPickCustom,
  onClear,
}: {
  medicines: Medicine[];
  value: string;
  inInventory: boolean;
  onPickInventory: (med: Medicine) => void;
  onPickCustom: (name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicines.slice(0, 40);
    return medicines
      .filter((m) => {
        const hay = `${m.name} ${m.description || ""} ${m.sku || ""} ${m.category || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [medicines, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return medicines.find((m) => m.name.trim().toLowerCase() === q) || null;
  }, [medicines, query]);

  const commitCustom = () => {
    const name = query.trim();
    if (!name) return;
    if (exactMatch) {
      onPickInventory(exactMatch);
    } else {
      onPickCustom(name);
    }
    setOpen(false);
  };

  if (value) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-sm transition-colors",
          inInventory
            ? "border-emerald-200/80 bg-linear-to-br from-emerald-50/90 to-white"
            : "border-cta/25 bg-linear-to-br from-amber-50/90 to-white",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
            inInventory
              ? "bg-emerald-100/80 text-emerald-700 ring-emerald-200/70"
              : "bg-cta/15 text-amber-800 ring-cta/25",
          )}
        >
          {inInventory ? <Package className="size-4.5" /> : <Store className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-semibold tracking-tight text-primary">
            {value}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {inInventory
              ? "Clinic pharmacy · billed after reception payment"
              : "Outside pharmacy · printed at checkout"}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-white/80 hover:text-foreground"
          onClick={onClear}
          aria-label="Clear medicine"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-12 w-full justify-between rounded-2xl border-primary/12 bg-white px-3.5 font-normal shadow-sm",
            "hover:border-primary/25 hover:bg-primary/2",
            open && "border-cta/40 ring-2 ring-cta/15",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/6 text-primary/70">
              <Pill className="size-3.5" />
            </span>
            <span className="truncate">Search stock or type a full medicine name…</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) overflow-hidden rounded-2xl border-primary/10 p-0 shadow-xl shadow-primary/10"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search inventory…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              }
            }}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <div className="space-y-3 px-3 py-4 text-sm">
                <div className="rounded-xl border border-dashed border-cta/30 bg-amber-50/60 px-3 py-3">
                  <p className="font-medium text-amber-900">Not in clinic inventory</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Add as an outside-pharmacy medicine. Dose will be required.
                  </p>
                </div>
                {query.trim() ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 w-full rounded-xl bg-cta text-cta-foreground hover:bg-cta/90"
                    onClick={commitCustom}
                  >
                    <Store className="size-3.5" />
                    Use “{query.trim()}”
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Clinic inventory">
              {filtered.map((med) => {
                const low =
                  med.on_hand != null &&
                  med.min_threshold != null &&
                  Number(med.on_hand) <= Number(med.min_threshold);
                return (
                  <CommandItem
                    key={med.id}
                    value={String(med.id)}
                    onSelect={() => {
                      onPickInventory(med);
                      setOpen(false);
                    }}
                    className="items-start gap-2 rounded-xl px-2.5 py-2.5"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        value === med.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{med.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        {med.category ? <span className="capitalize">{med.category}</span> : null}
                        {med.unit_of_measure ? <span>· {med.unit_of_measure}</span> : null}
                        {med.on_hand != null ? (
                          <span className={cn(low && "font-semibold text-amber-700")}>
                            · stock {med.on_hand}
                            {low ? " · low" : ""}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <Package className="mt-0.5 size-3.5 shrink-0 text-emerald-600/70" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {query.trim() && !exactMatch ? (
              <CommandGroup heading="Outside pharmacy">
                <CommandItem
                  value={`custom-${query}`}
                  onSelect={commitCustom}
                  className="items-start gap-2 rounded-xl px-2.5 py-2.5"
                >
                  <Plus className="mt-0.5 size-4 shrink-0 text-cta" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Add “{query.trim()}”</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Not in inventory · print at checkout
                    </span>
                  </span>
                  <Store className="mt-0.5 size-3.5 shrink-0 text-cta" />
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function parseRxDetails(details: string) {
  const parts = details.split(" · ").map((p) => p.trim()).filter(Boolean);
  const name = parts[0] || "Prescription";
  const meta = parts.slice(1);
  return { name, meta };
}

export default function DoctorPharmacyPrescriptionPage() {
  const { encounters, current, selectedId, setSelectedId, load } = useEncounterBoard("doctor");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [lines, setLines] = useState<RxLine[]>([newLine()]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadMedicines = useCallback(async () => {
    const rows = await fetchClinicCatalog<Medicine>(
      "medicines",
      "/clinic/medicines/",
      { page_size: 200 },
    );
    setMedicines(rows.filter((m) => m.is_active !== false));
  }, []);

  useEffect(() => {
    loadMedicines().catch(() => toast.error("Could not load medicines"));
  }, [loadMedicines]);

  const history = useMemo(
    () => (current?.orders ?? []).filter((o) => o.order_type === "prescription"),
    [current?.orders],
  );

  const readyCount = useMemo(
    () => lines.filter((line) => line.medicineName.trim()).length,
    [lines],
  );
  const clinicCount = useMemo(
    () => lines.filter((line) => line.medicineName.trim() && line.inInventory).length,
    [lines],
  );
  const externalCount = useMemo(
    () => lines.filter((line) => line.medicineName.trim() && !line.inInventory).length,
    [lines],
  );

  const updateLine = (id: string, patch: Partial<RxLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  };

  const submit = async () => {
    if (!current) return;
    const ready = lines.filter((line) => line.medicineName.trim());
    if (!ready.length) {
      toast.error("Add at least one medicine");
      return;
    }
    for (const line of ready) {
      if (!line.frequency) {
        toast.error(`Choose a frequency for ${line.medicineName}`);
        return;
      }
      if (!line.inInventory && !line.dose.trim()) {
        toast.error(`Enter a dose for ${line.medicineName} (not in clinic inventory)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const line of ready) {
        const parts = [
          line.medicineName,
          !line.inInventory && line.dose ? `Dose: ${line.dose}` : null,
          `Freq: ${line.frequency}`,
          line.duration.trim()
            ? `Duration: ${line.duration.trim()}`
            : "Duration: till medicine ends",
          line.inInventory ? "Fulfillment: clinic pharmacy" : "Fulfillment: external (print at checkout)",
          notes.trim() || null,
        ].filter(Boolean);

        await api.post("/clinic/orders/", {
          encounter: current.id,
          order_type: "prescription",
          details: parts.join(" · "),
          medicine: line.medicineId || undefined,
          medicine_name: line.inInventory ? undefined : line.medicineName.trim(),
        });
      }
      toast.success(
        ready.length === 1 ? "Prescription sent" : `${ready.length} medicines ordered`,
      );
      setLines([newLine()]);
      setNotes("");
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not send prescription",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClinicShell
      title="Pharmacy prescription"
      subtitle="Build a clean multi-medicine Rx — clinic stock or outside pharmacy in one send."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <div className="grid gap-6 xl:grid-cols-5">
          <SectionCard
            kicker="Compose Rx"
            title="Medicine order"
            description="Pick from inventory or type a full name. Batch several lines, then send once."
            className="xl:col-span-3"
            action={
              readyCount > 0 ? (
                <StatusPill tone="navy">{readyCount} ready</StatusPill>
              ) : undefined
            }
          >
            <VisitPatientStrip encounter={current} />
            <div className="mb-5 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/10 bg-linear-to-br from-white to-primary/4 px-3.5 py-3">
                <p className="text-[11px] font-medium text-muted-foreground">Lines ready</p>
                <p className="mt-1 font-heading text-2xl font-semibold text-primary">{readyCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-linear-to-br from-emerald-50/80 to-white px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800/80">
                  <Building2 className="size-3" />
                  Clinic pharmacy
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold text-emerald-800">
                  {clinicCount}
                </p>
              </div>
              <div className="rounded-2xl border border-cta/25 bg-linear-to-br from-amber-50/80 to-white px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-900/80">
                  <Store className="size-3" />
                  Outside print
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold text-amber-900">
                  {externalCount}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => {
                const selected = Boolean(line.medicineName.trim());
                return (
                  <div
                    key={line.id}
                    className={cn(
                      "relative overflow-hidden rounded-3xl border p-4 shadow-sm transition-all duration-200 sm:p-5",
                      selected
                        ? line.inInventory
                          ? "border-emerald-200/70 bg-linear-to-br from-white via-white to-emerald-50/40"
                          : "border-cta/20 bg-linear-to-br from-white via-white to-amber-50/40"
                        : "border-primary/10 bg-linear-to-br from-slate-50/90 to-white",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 w-1",
                        selected
                          ? line.inInventory
                            ? "bg-emerald-500/70"
                            : "bg-cta/80"
                          : "bg-primary/15",
                      )}
                    />

                    <div className="mb-4 flex items-center justify-between gap-3 pl-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-primary-foreground shadow-sm shadow-primary/20">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-heading text-sm font-semibold text-primary">
                            Medicine line
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {selected
                              ? line.inInventory
                                ? "Routed to clinic pharmacy"
                                : "Outside pharmacy · dose required"
                              : "Search inventory or enter a full name"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {selected ? (
                          <StatusPill tone={line.inInventory ? "green" : "orange"}>
                            {line.inInventory ? "In stock" : "Outside"}
                          </StatusPill>
                        ) : null}
                        {lines.length > 1 ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => removeLine(line.id)}
                            aria-label={`Remove medicine ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3.5 pl-1">
                      <div className="space-y-1.5">
                        <FieldLabel>Medicine</FieldLabel>
                        <MedicinePicker
                          medicines={medicines}
                          value={line.medicineName}
                          inInventory={line.inInventory}
                          onPickInventory={(med) =>
                            updateLine(line.id, {
                              medicineId: med.id,
                              medicineName: med.name,
                              inInventory: true,
                              dose: "",
                            })
                          }
                          onPickCustom={(name) =>
                            updateLine(line.id, {
                              medicineId: null,
                              medicineName: name,
                              inInventory: false,
                            })
                          }
                          onClear={() =>
                            updateLine(line.id, {
                              medicineId: null,
                              medicineName: "",
                              inInventory: false,
                              dose: "",
                            })
                          }
                        />
                      </div>

                      {!line.inInventory && line.medicineName ? (
                        <div className="space-y-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                          <FieldLabel htmlFor={`dose-${line.id}`} hint="Required">
                            Dose
                          </FieldLabel>
                          <Input
                            id={`dose-${line.id}`}
                            className="h-11 rounded-2xl border-cta/20 bg-white shadow-sm focus-visible:border-cta/40 focus-visible:ring-cta/20"
                            placeholder="e.g. 500 mg · 1 tablet"
                            value={line.dose}
                            onChange={(e) => updateLine(line.id, { dose: e.target.value })}
                          />
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <FieldLabel>Frequency</FieldLabel>
                          <Select
                            value={line.frequency}
                            onValueChange={(value) => updateLine(line.id, { frequency: value })}
                          >
                            <SelectTrigger className="h-11 w-full rounded-2xl border-primary/12 bg-white shadow-sm">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {MEDICINE_FREQUENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel htmlFor={`duration-${line.id}`} hint="Optional">
                            Duration
                          </FieldLabel>
                          <div className="relative">
                            <Clock3 className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
                            <Input
                              id={`duration-${line.id}`}
                              className="h-11 rounded-2xl border-primary/12 bg-white pl-9 shadow-sm"
                              placeholder="Till medicine ends"
                              value={line.duration}
                              onChange={(e) => updateLine(line.id, { duration: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-dashed border-primary/20 bg-primary/2 text-primary hover:border-primary/35 hover:bg-primary/5"
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                <Plus className="size-4" />
                Add another medicine
              </Button>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="rx-notes" hint="Optional">
                  Batch notes
                </FieldLabel>
                <Textarea
                  id="rx-notes"
                  className="min-h-20 rounded-2xl border-primary/12 bg-white shadow-sm"
                  placeholder="Shared notes for this prescription batch…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="sticky bottom-3 z-10 rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-lg shadow-primary/10 backdrop-blur-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 px-1">
                    <p className="text-sm font-semibold text-primary">
                      {readyCount
                        ? `Send ${readyCount} medicine${readyCount === 1 ? "" : "s"}`
                        : "Add a medicine to send"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {clinicCount ? `${clinicCount} clinic` : null}
                      {clinicCount && externalCount ? " · " : null}
                      {externalCount ? `${externalCount} outside` : null}
                      {!clinicCount && !externalCount
                        ? "Clinic stock waits for payment; outside prints at checkout."
                        : ""}
                    </p>
                  </div>
                  <LoadingButton
                    type="button"
                    className={cn(ctaButtonClass, "w-full shrink-0 sm:w-auto sm:min-w-48")}
                    loading={submitting}
                    loadingLabel="Sending…"
                    disabled={!readyCount}
                    onClick={() => void submit()}
                  >
                    <Pill className="size-4" />
                    Send prescription
                  </LoadingButton>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            kicker="This visit"
            title="Prescription history"
            description="Clinic lines await payment; outside medicines print at checkout."
            className="xl:col-span-2"
            action={
              history.length ? (
                <StatusPill tone="navy">{history.length} Rx</StatusPill>
              ) : undefined
            }
          >
            {!history.length ? (
              <EmptyState
                title="No prescriptions yet"
                hint="Compose medicines on the left and send the batch."
                icon={<Pill className="size-5" />}
              />
            ) : (
              <div className="space-y-3">
                {history.map((order) => {
                  const parsed = parseRxDetails(order.details || "");
                  const isExternal = /external|outside/i.test(order.details || "");
                  return (
                    <QueueItem key={order.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                              isExternal
                                ? "bg-cta/12 text-amber-800 ring-cta/20"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
                            )}
                          >
                            {isExternal ? (
                              <Store className="size-4" />
                            ) : (
                              <Package className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-primary">{parsed.name}</p>
                            {parsed.meta.length ? (
                              <ul className="mt-1.5 space-y-1">
                                {parsed.meta.map((item) => (
                                  <li
                                    key={item}
                                    className="truncate text-xs leading-5 text-muted-foreground"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                        <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
