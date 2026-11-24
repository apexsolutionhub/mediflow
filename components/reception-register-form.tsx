"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { UserRound, UserSearch } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ctaButtonClass, EmptyState, FormSection, SectionCard } from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { invalidateEncounterBoardCache } from "@/hooks/use-encounter-board";
import { fetchClinicCatalog, invalidateClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { type Encounter, type Patient } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export type ArrivalType = "new" | "returning";

const META: Record<
  ArrivalType,
  { title: string; subtitle: string; kicker: string; submit: string }
> = {
  new: {
    title: "New patient",
    subtitle: "Create a branch patient record and open today's encounter.",
    kicker: "Register · New",
    submit: "Open new encounter",
  },
  returning: {
    title: "Returning patient",
    subtitle: "Pick an existing branch patient who is not already on the board.",
    kicker: "Register · Returning",
    submit: "Open returning encounter",
  },
};

type FormValues = {
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  patient_id: string;
};

type ReturningPatientOption = Patient & { visit_count: number };

function normalizePatientName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function visitLabel(count: number) {
  if (count <= 0) return "No prior visits on record";
  if (count === 1) return "Visited 1 time";
  return `Visited ${count} times`;
}

export function ReceptionRegisterForm({ arrivalType }: { arrivalType: ArrivalType }) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [registering, setRegistering] = useState(false);
  const meta = META[arrivalType];
  const registerForm = useForm<FormValues>({
    defaultValues: {
      full_name: "",
      age: 30,
      gender: "Female",
      phone: "",
      address: "",
      patient_id: "",
    },
  });

  const selectedPatientId = registerForm.watch("patient_id");

  const loadReturningData = useCallback(async (force = false) => {
    const [patientRows, encounterResponse] = await Promise.all([
      fetchClinicCatalog<Patient>("patients", "/clinic/patients/", { page_size: 200 }, force),
      api.get("/clinic/encounters/", { params: { page_size: 200 } }),
    ]);
    setPatients(patientRows);
    setEncounters(results<Encounter>(encounterResponse.data));
  }, []);

  useEffect(() => {
    if (arrivalType !== "returning") return;
    loadReturningData().catch(() =>
      toast.error("Could not load patients", { id: "register-patients" }),
    );
  }, [arrivalType, loadReturningData]);

  const returningOptions = useMemo(() => {
    const visitCounts = new Map<number, number>();
    const openPatientIds = new Set<number>();

    for (const encounter of encounters) {
      const patientId = encounter.patient?.id;
      if (!patientId) continue;
      visitCounts.set(patientId, (visitCounts.get(patientId) || 0) + 1);
      if (String(encounter.status || "").toLowerCase() !== "closed") {
        openPatientIds.add(patientId);
      }
    }

    const available = patients.filter((p) => !openPatientIds.has(p.id));

    // One row per normalized name — keep the record with the most visits (then lowest id).
    const byName = new Map<string, ReturningPatientOption>();
    for (const patient of available) {
      const key = normalizePatientName(patient.full_name || "");
      if (!key) continue;
      const visit_count = visitCounts.get(patient.id) || 0;
      const existing = byName.get(key);
      if (
        !existing ||
        visit_count > existing.visit_count ||
        (visit_count === existing.visit_count && patient.id < existing.id)
      ) {
        byName.set(key, { ...patient, visit_count });
      }
    }

    return Array.from(byName.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" }),
    );
  }, [encounters, patients]);

  const selectedPatient = useMemo(
    () => returningOptions.find((p) => String(p.id) === selectedPatientId) ?? null,
    [returningOptions, selectedPatientId],
  );

  const register = async (values: FormValues) => {
    setRegistering(true);
    try {
      let patientId: string | number | undefined = values.patient_id;
      if (arrivalType !== "returning") {
        const created = await api.post("/clinic/patients/", {
          full_name: values.full_name,
          age: Number(values.age) || 0,
          gender: values.gender,
          phone: values.phone,
          address: values.address || "",
        });
        patientId = created.data.id;
        invalidateClinicCatalog("patients", { page_size: 200 });
      }
      if (!patientId) {
        toast.error("Select or create a patient");
        return;
      }

      await api.post("/clinic/encounters/", {
        patient_id: Number(patientId),
        arrival_type: arrivalType,
      });
      invalidateEncounterBoardCache();
      toast.success("Encounter opened — consultation awaiting payment");
      router.push("/reception");
    } catch {
      toast.error("Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const identityFields = (
    <FormSection title="Identity">
      <div className="sm:col-span-2">
        <CustomFormField
          control={registerForm.control}
          name="full_name"
          fieldType={formFieldTypes.INPUT}
          label="Full name"
          placeholder="Patient full name"
        />
      </div>
      <div className="@container sm:col-span-2">
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @lg:items-start">
        <CustomFormField
          control={registerForm.control}
          name="age"
          fieldType={formFieldTypes.INPUT}
          type="number"
          label="Age"
        />
        <Field>
          <FieldLabel className="text-sm font-medium">Gender</FieldLabel>
          <Controller
            control={registerForm.control}
            name="gender"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex w-full flex-wrap gap-2"
              >
                {[
                  { label: "Female", value: "Female" },
                  { label: "Male", value: "Male" },
                  { label: "Other", value: "Other" },
                ].map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={`gender-${option.value}`}
                    className="flex min-w-[5.5rem] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2.5 text-center transition-colors hover:border-(--role)/40 has-checked:border-(--role) has-checked:bg-(--role)/8 has-checked:shadow-sm"
                  >
                    <RadioGroupItem
                      id={`gender-${option.value}`}
                      value={option.value}
                    />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </FieldLabel>
                ))}
              </RadioGroup>
            )}
          />
        </Field>
      </div>
      </div>
    </FormSection>
  );

  const contactFields = (
    <FormSection title="Contact">
      <div className="sm:col-span-2">
        <CustomFormField
          control={registerForm.control}
          name="phone"
          fieldType={formFieldTypes.PHONE_INPUT}
          label="Phone"
          placeholder="Mobile number"
        />
      </div>
      <div className="sm:col-span-2">
        <CustomFormField
          control={registerForm.control}
          name="address"
          fieldType={formFieldTypes.INPUT}
          label="Address"
          placeholder="Neighborhood, city, or kebele"
        />
      </div>
    </FormSection>
  );

  return (
    <ClinicShell title={meta.title} subtitle={meta.subtitle}>
      <SectionCard
        className="mx-auto w-full max-w-2xl"
        kicker={meta.kicker}
        title={meta.title}
        description={meta.subtitle}
      >
        <form onSubmit={registerForm.handleSubmit(register)}>
          <FieldGroup>
            {arrivalType === "returning" ? (
              <>
                <FormSection
                  title="Select patient"
                  description="Patients already checked in (not checked out) are hidden. Duplicate names appear once with visit history."
                >
                  <div className="sm:col-span-2">
                    <CustomFormField
                      control={registerForm.control}
                      name="patient_id"
                      fieldType={formFieldTypes.SELECT}
                      label="Branch patient"
                      placeholder="Choose a returning patient"
                      options={returningOptions.map((p) => ({
                        label: `${p.full_name}${p.mrn ? ` · ${p.mrn}` : ""}${p.phone ? ` · ${p.phone}` : ""}`,
                        value: String(p.id),
                        description: visitLabel(p.visit_count),
                      }))}
                    />
                  </div>
                </FormSection>

                {selectedPatient ? (
                  <Card className="gap-0 rounded-2xl border-primary/15 bg-primary/5 py-0">
                    <CardContent className="flex items-start gap-3 p-4">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                        <UserRound className="size-5" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.16em] text-(--role-ink) uppercase">
                          Selected patient
                        </p>
                        <p className="mt-1 font-heading text-lg font-semibold text-primary">
                          {selectedPatient.full_name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedPatient.mrn}
                          {selectedPatient.age != null ? ` · Age ${selectedPatient.age}` : ""}
                          {selectedPatient.gender ? ` · ${selectedPatient.gender}` : ""}
                          {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}
                        </p>
                        <p className="mt-1 text-sm font-medium text-primary/80">
                          {visitLabel(selectedPatient.visit_count)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState
                    title="No patient selected"
                    hint="Select a patient to confirm identity before opening the encounter."
                    icon={<UserSearch className="size-5" />}
                  />
                )}
              </>
            ) : (
              <>
                {identityFields}
                {contactFields}
              </>
            )}

            <Separator className="bg-primary/8" />

            <SubmitButton
              size="lg"
              className={cn("h-11 w-full rounded-xl font-semibold sm:w-auto", ctaButtonClass)}
              loading={registering}
              loadingLabel="Opening encounter…"
            >
              {meta.submit}
            </SubmitButton>
          </FieldGroup>
        </form>
      </SectionCard>
    </ClinicShell>
  );
}
