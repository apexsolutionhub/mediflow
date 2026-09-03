"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { EncounterVisitSelector } from "@/components/encounter-visit-selector";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api, results } from "@/lib/api";
import { type ClinicBranch, type Department } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function DoctorReferralsPage() {
  const { encounters, current, selectedId, setSelectedId } = useEncounterBoard("doctor");
  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const referralForm = useForm({
    defaultValues: { to_department: "", to_branch: "", diagnosis: "", lab_summary: "" },
  });

  const selectedBranch = referralForm.watch("to_branch");

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

  useEffect(() => {
    loadBranches().catch(() => toast.error("Could not load organization branches"));
  }, [loadBranches]);

  useEffect(() => {
    if (!selectedBranch) {
      setDepartments([]);
      referralForm.setValue("to_department", "");
      return;
    }
    loadDepts(selectedBranch).catch(() => toast.error("Could not load departments"));
  }, [selectedBranch, loadDepts, referralForm]);

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
      subtitle="Pick a same-org branch first, then a department at that branch."
    >
      <EncounterVisitSelector
        encounters={encounters}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {current ? (
        <SectionCard
          className="mx-auto max-w-lg"
          kicker="Handoff"
          title="Referral"
          description="Route the patient with diagnosis and investigation summary."
        >
          <form
            className="grid gap-4"
            onSubmit={referralForm.handleSubmit(async (values) => {
              if (!values.to_branch) {
                toast.error("Select a destination branch");
                return;
              }
              if (!values.to_department) {
                toast.error("Select a department at that branch");
                return;
              }
              setSubmitting(true);
              try {
                await api.post("/clinic/referrals/", {
                  encounter: current.id,
                  to_department: values.to_department,
                  to_branch: values.to_branch,
                  diagnosis: values.diagnosis || current.chart?.diagnosis || "",
                  lab_summary: values.lab_summary,
                });
                toast.success("Referral recorded");
                referralForm.reset();
              } finally {
                setSubmitting(false);
              }
            })}
          >
            <CustomFormField
              control={referralForm.control}
              name="to_branch"
              fieldType={formFieldTypes.SELECT}
              label="Organization branch"
              placeholder={
                branchOptions.length ? "Select branch" : "No branches yet — add in Apex admin"
              }
              options={branchOptions}
            />
            <CustomFormField
              control={referralForm.control}
              name="to_department"
              fieldType={formFieldTypes.SELECT}
              label="Department"
              disabled={!selectedBranch}
              placeholder={selectedBranch ? "Select department" : "Choose a branch first"}
              options={departments.map((d) => ({
                label: d.name,
                value: d.name,
              }))}
            />
            <CustomFormField
              control={referralForm.control}
              name="diagnosis"
              fieldType={formFieldTypes.INPUT}
              label="Diagnosis payload"
            />
            <CustomFormField
              control={referralForm.control}
              name="lab_summary"
              fieldType={formFieldTypes.TEXTAREA}
              label="Lab / radiology summary"
            />
            <SubmitButton className={ctaButtonClass} loading={submitting} loadingLabel="Sending…">
              <Send className="size-4" />
              Create referral
            </SubmitButton>
          </form>
        </SectionCard>
      ) : null}
    </ClinicShell>
  );
}
