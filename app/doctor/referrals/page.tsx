"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SelectedVisitBanner } from "@/components/selected-visit-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { ctaButtonClass, SectionCard } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import { type Department } from "@/lib/clinic";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import { useEncounterBoard } from "@/hooks/use-encounter-board";

export default function DoctorReferralsPage() {
  const { current } = useEncounterBoard("doctor");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const referralForm = useForm({
    defaultValues: { to_department: "", to_branch: "", diagnosis: "", lab_summary: "" },
  });

  const loadDepts = useCallback(async () => {
    const rows = await fetchClinicCatalog<Department>(
      "departments",
      "/clinic/departments/",
      { page_size: 50 },
    );
    setDepartments(rows);
  }, []);

  useEffect(() => {
    loadDepts().catch(() => toast.error("Could not load departments"));
  }, [loadDepts]);

  return (
    <ClinicShell
      title="Referrals"
      subtitle="Send the patient to another department or same-org branch."
    >
      <SelectedVisitBanner encounter={current} boardHref="/doctor" boardLabel="active visits" />
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
              name="to_department"
              fieldType={formFieldTypes.SELECT}
              label="Department"
              options={departments.map((d) => ({
                label: d.name,
                value: d.name,
              }))}
            />
            <CustomFormField
              control={referralForm.control}
              name="to_branch"
              fieldType={formFieldTypes.INPUT}
              label="Same-org branch (optional)"
              placeholder="Leave blank for in-branch"
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
