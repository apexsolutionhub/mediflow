"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Pill, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
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

function MedicinePicker({
  medicines,
  value,
  onPickInventory,
  onPickCustom,
}: {
  medicines: Medicine[];
  value: string;
  onPickInventory: (med: Medicine) => void;
  onPickCustom: (name: string) => void;
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
        const hay = `${m.name} ${m.description || ""} ${m.sku || ""}`.toLowerCase();
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between rounded-xl border-primary/15 bg-white font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Search clinic medicines or type a full name…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
          <CommandList>
            <CommandEmpty>
              <div className="space-y-2 px-2 py-3 text-sm">
                <p className="text-muted-foreground">
                  Not in clinic inventory. Add as an outside-pharmacy medicine.
                </p>
                {query.trim() ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={commitCustom}
                  >
                    Use “{query.trim()}”
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Clinic inventory">
              {filtered.map((med) => (
                <CommandItem
                  key={med.id}
                  value={String(med.id)}
                  onSelect={() => {
                    onPickInventory(med);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === med.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {med.name}
                    {med.on_hand != null ? (
                      <span className="text-muted-foreground"> · stock {med.on_hand}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() && !exactMatch ? (
              <CommandGroup heading="Outside pharmacy">
                <CommandItem value={`custom-${query}`} onSelect={commitCustom}>
                  <Plus className="mr-2 size-4" />
                  Add “{query.trim()}” (not in inventory)
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
        ready.length === 1
          ? "Prescription sent"
          : `${ready.length} medicines ordered`,
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
      subtitle="Search clinic stock or type a full medicine name. Batch several lines in one send."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            kicker="Prescription"
            title="Medicine order"
            description="Inventory matches go to clinic pharmacy after payment. Typed names are treated as outside pharmacy (printed at checkout)."
          >
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Medicine {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      {line.medicineName ? (
                        <StatusPill tone={line.inInventory ? "green" : "orange"}>
                          {line.inInventory ? "In stock" : "Outside pharmacy"}
                        </StatusPill>
                      ) : null}
                      {lines.length > 1 ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Medicine</Label>
                      <MedicinePicker
                        medicines={medicines}
                        value={line.medicineName}
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
                      />
                      {line.medicineName ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            updateLine(line.id, {
                              medicineId: null,
                              medicineName: "",
                              inInventory: false,
                              dose: "",
                            })
                          }
                        >
                          <X className="size-3" /> Clear medicine
                        </button>
                      ) : null}
                    </div>

                    {!line.inInventory && line.medicineName ? (
                      <div className="space-y-1.5">
                        <Label htmlFor={`dose-${line.id}`}>Dose</Label>
                        <Input
                          id={`dose-${line.id}`}
                          className="h-11 rounded-xl"
                          placeholder="e.g. 500mg"
                          value={line.dose}
                          onChange={(e) => updateLine(line.id, { dose: e.target.value })}
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Frequency</Label>
                        <Select
                          value={line.frequency}
                          onValueChange={(value) => updateLine(line.id, { frequency: value })}
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEDICINE_FREQUENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`duration-${line.id}`}>
                          Duration{" "}
                          <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id={`duration-${line.id}`}
                          className="h-11 rounded-xl"
                          placeholder="Till medicine ends"
                          value={line.duration}
                          onChange={(e) => updateLine(line.id, { duration: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                <Plus className="size-4" />
                Add another medicine
              </Button>

              <div className="space-y-1.5">
                <Label htmlFor="rx-notes">Additional notes (optional)</Label>
                <Input
                  id="rx-notes"
                  className="h-11 rounded-xl"
                  placeholder="Shared notes for this batch"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <LoadingButton
                type="button"
                className={ctaButtonClass}
                loading={submitting}
                loadingLabel="Sending…"
                onClick={() => void submit()}
              >
                <Pill className="size-4" />
                Send prescription
              </LoadingButton>
            </div>
          </SectionCard>

          <SectionCard
            kicker="This visit"
            title="Prescription history"
            description="Clinic stock lines await payment; outside medicines print at checkout."
            action={
              history.length ? (
                <StatusPill tone="navy">{history.length} Rx</StatusPill>
              ) : undefined
            }
          >
            {!history.length ? (
              <EmptyState title="No prescriptions yet" hint="Add medicines on the left and send." />
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <QueueItem key={order.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill className="size-4 shrink-0 text-primary/70" />
                          <p className="font-heading font-semibold text-primary">Prescription</p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{order.details}</p>
                      </div>
                      <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                    </div>
                  </QueueItem>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </ClinicShell>
  );
}
