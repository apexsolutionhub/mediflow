"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SectionCard } from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type Patient } from "@/lib/clinic";

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

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-cta uppercase">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ReceptionRegisterForm({ arrivalType }: { arrivalType: ArrivalType }) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
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

  const loadPatients = useCallback(async () => {
    const people = await api.get("/clinic/patients/", { params: { page_size: 200 } });
    setPatients(results<Patient>(people.data));
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
      toast.success("Encounter opened — consultation awaiting payment");
      router.push("/reception");
    } catch {
      toast.error("Registration failed");
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
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Gender</Label>
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
                  <label
                    key={option.value}
                    htmlFor={`gender-${option.value}`}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-2 py-2.5 text-center has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem
                      id={`gender-${option.value}`}
                      value={option.value}
                    />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
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
        className="mx-auto max-w-2xl"
        kicker={meta.kicker}
        title={meta.title}
        description={meta.subtitle}
      >
        <form className="grid gap-6" onSubmit={registerForm.handleSubmit(register)}>
          {arrivalType === "returning" ? (
            <div className="space-y-4">
              <FormSection title="Find patient">
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
                <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-4">
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
              ) : (
                <p className="rounded-2xl border border-dashed border-primary/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Select a patient to confirm identity before opening the encounter.
                </p>
              )}
            </div>
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
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cta/25 bg-cta/5 px-4 py-3.5">
                      <Checkbox
                        checked={Boolean(field.value)}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5 border-cta data-checked:border-cta data-checked:bg-cta"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-primary">Urgent</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Mark this referred arrival for priority handling on the board.
                        </span>
                      </span>
                    </label>
                  )}
                />
              </div>
            </FormSection>
          ) : null}

          <Button type="submit" size="lg" className="h-11 rounded-xl font-semibold shadow-sm">
            {meta.submit}
          </Button>
        </form>
      </SectionCard>
    </ClinicShell>
  );
}
