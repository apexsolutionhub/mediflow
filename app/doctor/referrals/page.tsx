"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Building2, Send } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { VisitPatientStrip } from "@/components/visit-patient-strip";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard, StatusPill } from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicBranch, type Department, type Referral } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";
import { cn } from "@/lib/utils";

type ReferralFormValues = {
  destination_kind: "internal" | "external";
  to_branch: string;
  to_department: string;
  external_institution: string;
  diagnosis: string;
  lab_summary: string;
};

export default function DoctorReferralsPage() {
  const { encounters, current, selectedId, setSelectedId } = useEncounterBoard("doctor");
  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<Referral[]>([]);
  const referralForm = useForm<ReferralFormValues>({
    defaultValues: {
      destination_kind: "internal",
      to_department: "",
      to_branch: "",
      external_institution: "",
      diagnosis: "",
      lab_summary: "",
    },
  });

  const selectedBranch = referralForm.watch("to_branch");
  const destinationKind = referralForm.watch("destination_kind");

  const loadBranches = useCallback(async () => {
    try {
      const { data } = await api.get("/clinic/branches/", { params: { page_size: 100 } });
      setBranches(results<ClinicBranch>(data).filter((b) => b.is_active !== false));
    } catch {
      setBranches([]);
    }
  }, []);

  const loadDepts = useCallback(async (branchName?: string) => {
    const params: Record<string, string | number> = { page_size: 50 };
    if (branchName) params.branch = branchName;
    try {
      const rows = await fetchClinicCatalog<Department>(
        "departments",
        "/clinic/departments/",
        params,
        true,
      );
      setDepartments(rows.filter((d) => d.is_active !== false));
    } catch {
      setDepartments([]);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const { data } = await api.get("/clinic/referrals/", { params: { page_size: 20 } });
      setRecent(results<Referral>(data));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    loadBranches().catch(() => toast.error("Could not load organization branches"));
    loadRecent().catch(() => undefined);
  }, [loadBranches, loadRecent]);

  useEffect(() => {
    if (destinationKind !== "internal" || !selectedBranch) {
      setDepartments([]);
      referralForm.setValue("to_department", "");
      return;
    }
    loadDepts(selectedBranch).catch(() => toast.error("Could not load departments"));
  }, [selectedBranch, destinationKind, loadDepts, referralForm]);

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        label: b.name,
        value: b.name,
        description: b.is_main ? "Main branch" : undefined,
      })),
    [branches],
  );

  return (
    <ClinicShell
      title="Referrals"
      subtitle="Same-org branch or outside facility — manager approval is required before reception can print."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <SectionCard
          className="mx-auto w-full max-w-xl"
          kicker="Handoff"
          title="Referral"
          description="Route inside the organization or outside. Print waits for manager approval."
        >
          <VisitPatientStrip encounter={current} />
          <form
            className="space-y-4"
            onSubmit={referralForm.handleSubmit(async (values) => {
              if (values.destination_kind === "internal") {
                if (!values.to_branch) {
                  toast.error("Select a destination branch");
                  return;
                }
                if (!values.to_department) {
                  toast.error("Select a department at that branch");
                  return;
                }
              }
              setSubmitting(true);
              try {
                await api.post("/clinic/referrals/", {
                  encounter: current.id,
                  destination_kind: values.destination_kind,
                  to_department:
                    values.destination_kind === "internal" ? values.to_department : "",
                  to_branch: values.destination_kind === "internal" ? values.to_branch : "",
                  external_institution:
                    values.destination_kind === "external"
                      ? values.external_institution.trim()
                      : "",
                  diagnosis: values.diagnosis || current.chart?.diagnosis || "",
                  lab_summary: values.lab_summary,
                });
                toast.success("Referral sent — waiting for manager approval");
                referralForm.reset({
                  destination_kind: "internal",
                  to_department: "",
                  to_branch: "",
                  external_institution: "",
                  diagnosis: "",
                  lab_summary: "",
                });
                await loadRecent();
              } finally {
                setSubmitting(false);
              }
            })}
          >
            <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/3 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                  <Building2 className="size-3.5" />
                </span>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-(--role-ink) uppercase">
                  Destination
                </p>
              </div>

              <CustomFormField
                control={referralForm.control}
                name="destination_kind"
                fieldType={formFieldTypes.SELECT}
                label="Referral type"
                options={[
                  { label: "Same organization branch", value: "internal" },
                  { label: "Outside organization", value: "external" },
                ]}
              />

              {destinationKind === "internal" ? (
                <>
                  <CustomFormField
                    control={referralForm.control}
                    name="to_branch"
                    fieldType={formFieldTypes.SELECT}
                    label="Organization branch"
                    placeholder={
                      branchOptions.length
                        ? "Select branch"
                        : "No branches yet — add in Apex admin"
                    }
                    options={branchOptions}
                  />
                  <CustomFormField
                    control={referralForm.control}
                    name="to_department"
                    fieldType={formFieldTypes.SELECT}
                    label="Department"
                    disabled={!selectedBranch}
                    placeholder={
                      selectedBranch ? "Select department" : "Choose a branch first"
                    }
                    options={departments.map((d) => ({
                      label: d.name,
                      value: d.name,
                    }))}
                  />
                </>
              ) : (
                <CustomFormField
                  control={referralForm.control}
                  name="external_institution"
                  fieldType={formFieldTypes.INPUT}
                  label="Health institution (optional)"
                  placeholder="e.g. Black Lion Hospital — leave blank if unknown"
                  description="Outside referrals can name a specific facility or stay general."
                />
              )}
            </div>

            <div className="space-y-3.5 rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-cta/5 p-4 sm:p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-(--role-ink) uppercase">
                Clinical payload
              </p>
              <CustomFormField
                control={referralForm.control}
                name="diagnosis"
                fieldType={formFieldTypes.INPUT}
                label="Diagnosis"
              />
              <CustomFormField
                control={referralForm.control}
                name="lab_summary"
                fieldType={formFieldTypes.TEXTAREA}
                label="Lab / radiology summary"
              />
            </div>

            <div className="rounded-2xl border border-primary/10 bg-white/95 p-3 shadow-sm">
              <SubmitButton
                className={cn("h-11 w-full rounded-xl", ctaButtonClass)}
                loading={submitting}
                loadingLabel="Sending…"
              >
                <Send className="size-4" />
                Send for manager approval
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {recent.length > 0 ? (
        <SectionCard
          className="mx-auto w-full max-w-xl"
          kicker="Recent"
          title="Your referrals"
          description="Pending until the branch manager approves print."
        >
          <div className="space-y-3">
            {recent.slice(0, 8).map((r) => {
              const pending = (r.approval_status || "pending") === "pending";
              const outside = r.destination_kind === "external";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-border/70 bg-white/90 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-semibold text-primary">
                      {outside
                        ? r.external_institution?.trim() || "Outside organization"
                        : `${r.to_branch} · ${r.to_department}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.patient_name || "Patient"} · {r.diagnosis || "No diagnosis"}
                    </p>
                  </div>
                  <StatusPill tone={pending ? "orange" : r.approval_status === "approved" ? "green" : "muted"}>
                    {r.approval_status || "pending"}
                  </StatusPill>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
