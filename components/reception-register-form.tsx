"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { UserRound, UserSearch } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ctaButtonClass, EmptyState, FormSection, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { invalidateEncounterBoardCache } from "@/hooks/use-encounter-board";
import { fetchClinicCatalog, invalidateClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { type Patient } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export type ArrivalType = "new" | "returning" | "referred";

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
    subtitle: "Find an existing branch patient and open a fresh encounter.",
    kicker: "Register · Returning",
    submit: "Open returning encounter",
  },
  referred: {
    title: "Referred patient",
    subtitle: "Register a referred arrival with source and urgency details.",
    kicker: "Register · Referred",
    submit: "Open referred encounter",
  },
};

type FormValues = {
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  patient_id: string;
  patient_query: string;
  referral_source: string;
  referral_details: string;
  urgent: boolean;
};

export function ReceptionRegisterForm({ arrivalType }: { arrivalType: ArrivalType }) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
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
      patient_query: "",
      referral_source: "",
      referral_details: "",
      urgent: false,
    },
  });

  const patientQuery = registerForm.watch("patient_query");
  const selectedPatientId = registerForm.watch("patient_id");

  const loadPatients = useCallback(async (force = false) => {
    const rows = await fetchClinicCatalog<Patient>(
      "patients",
      "/clinic/patients/",
      { page_size: 200 },
      force,
    );
    setPatients(rows);
  }, []);

  useEffect(() => {
    if (arrivalType !== "returning") return;
    loadPatients().catch(() =>
      toast.error("Could not load patients", { id: "register-patients" }),
    );
  }, [arrivalType, loadPatients]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const hay = `${p.full_name} ${p.mrn} ${p.phone || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [patients, patientQuery]);

  const selectedPatient = useMemo(
    () => patients.find((p) => String(p.id) === selectedPatientId) ?? null,
    [patients, selectedPatientId],
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

      let referral_source = "";
      if (arrivalType === "referred") {
        referral_source = [
          values.urgent ? "URGENT" : null,
          values.referral_source?.trim() || null,
          values.referral_details?.trim() || null,
        ]
          .filter(Boolean)
          .join(" · ");
      }

      await api.post("/clinic/encounters/", {
        patient_id: Number(patientId),
        arrival_type: arrivalType,
        referral_source,
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
      <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
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
                className="grid w-full grid-cols-3 gap-2"
              >
                {[
                  { label: "Female", value: "Female" },
                  { label: "Male", value: "Male" },
                  { label: "Other", value: "Other" },
                ].map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={`gender-${option.value}`}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-2 py-2.5 text-center has-checked:border-primary/40 has-checked:bg-primary/5"
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
        className="mx-auto max-w-2xl"
        kicker={meta.kicker}
        title={meta.title}
        description={meta.subtitle}
      >
        <form onSubmit={registerForm.handleSubmit(register)}>
          <FieldGroup>
            {arrivalType === "returning" ? (
              <>
                <FormSection title="Find patient" description="Search branch records by name, MRN, or phone.">
                  <div className="sm:col-span-2">
                    <CustomFormField
                      control={registerForm.control}
                      name="patient_query"
                      fieldType={formFieldTypes.INPUT}
                      label="Search by name, MRN, or phone"
                      placeholder="Type to filter branch patients…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <CustomFormField
                      control={registerForm.control}
                      name="patient_id"
                      fieldType={formFieldTypes.SELECT}
                      label="Branch patient"
                      options={filteredPatients.map((p) => ({
                        label: `${p.full_name} · ${p.mrn}${p.phone ? ` · ${p.phone}` : ""}`,
                        value: String(p.id),
                      }))}
                    />
                  </div>
                </FormSection>

                {selectedPatient ? (
                  <Card className="gap-0 rounded-2xl border-primary/15 bg-primary/5 py-0">
                    <CardContent className="flex items-start gap-3 p-4">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <UserRound className="size-5" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
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

            {arrivalType === "referred" ? (
              <FormSection title="Referral">
                <div className="sm:col-span-2">
                  <CustomFormField
                    control={registerForm.control}
                    name="referral_source"
                    fieldType={formFieldTypes.INPUT}
                    label="Referral source"
                    placeholder="Clinic / doctor name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <CustomFormField
                    control={registerForm.control}
                    name="referral_details"
                    fieldType={formFieldTypes.TEXTAREA}
                    label="Referral details"
                    placeholder="Why referred / what was already done"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Controller
                    control={registerForm.control}
                    name="urgent"
                    render={({ field }) => (
                      <FieldLabel
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-2xl border border-cta/25 bg-cta/5 px-4 py-3.5",
                          field.value && "border-cta/40 bg-cta/10",
                        )}
                      >
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          className="mt-0.5 border-cta data-checked:border-cta data-checked:bg-cta"
                        />
                        <FieldContent>
                          <FieldLegend variant="label" className="text-sm font-semibold text-primary">
                            Urgent
                          </FieldLegend>
                          <FieldDescription>
                            Mark this referred arrival for priority handling on the board.
                          </FieldDescription>
                        </FieldContent>
                      </FieldLabel>
                    )}
                  />
                </div>
              </FormSection>
            ) : null}

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
