"use client";

import type { LabParameter, ResultFlag } from "@/lib/clinic";
import { cn } from "@/lib/utils";
import { FlagBadge } from "@/components/diagnostics/LabResultTable";

/** Client-side mirror of the server flag rule, for instant feedback only. */
export function previewFlag(p: LabParameter, raw: string | undefined): ResultFlag | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (p.result_type === "numeric") {
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    if (p.critical_low != null && n < Number(p.critical_low)) return "critical";
    if (p.critical_high != null && n > Number(p.critical_high)) return "critical";
    if (p.ref_low != null && n < Number(p.ref_low)) return "low";
    if (p.ref_high != null && n > Number(p.ref_high)) return "high";
    return "normal";
  }
  if (p.result_type === "choice") {
    const abnormal = (p.abnormal_choices || "").split(",").map((c) => c.trim());
    return abnormal.includes(value) ? "abnormal" : "normal";
  }
  return "normal";
}

export function isLabFormComplete(
  params: LabParameter[],
  values: Record<string, string> | undefined,
) {
  return params.every((p) => {
    const v = (values?.[String(p.id)] ?? "").trim();
    return v !== "" && !(p.result_type === "numeric" && Number.isNaN(Number(v)));
  });
}

export function LabResultForm({
  params,
  values,
  onChange,
}: {
  params: LabParameter[];
  values: Record<string, string>;
  onChange: (paramId: number, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {params.map((p) => {
        const key = String(p.id);
        const value = values[key] ?? "";
        const flag = previewFlag(p, value);
        return (
          <div
            key={p.id}
            className="@container rounded-xl border border-(--role)/15 bg-white px-3 py-2.5 shadow-xs"
          >
            <div className="grid gap-2 @lg:grid-cols-[minmax(0,1fr)_auto_auto] @lg:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">{p.name}</p>
              {p.reference_text ? (
                <p className="text-xs text-muted-foreground">
                  Ref: {p.reference_text} {p.result_type === "numeric" ? p.unit : ""}
                </p>
              ) : null}
            </div>
            {p.result_type === "choice" ? (
              <div className="flex flex-wrap gap-1.5">
                {(p.choice_list ?? []).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => onChange(p.id, choice)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                      value === choice
                        ? "border-(--role) bg-(--role) text-white shadow-md shadow-(--role)/25"
                        : "border-slate-200 bg-white text-primary hover:border-(--role)/40 hover:bg-(--role)/6",
                    )}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  inputMode={p.result_type === "numeric" ? "decimal" : "text"}
                  className={cn(
                    "h-10 w-32 rounded-lg border bg-white px-3 text-right text-sm tabular-nums shadow-xs outline-none focus:border-(--role)/60 focus:ring-3 focus:ring-(--role)/15",
                    flag && flag !== "normal" ? "border-red-300 bg-red-50/50 text-red-700" : "border-slate-200",
                  )}
                  value={value}
                  onChange={(e) => onChange(p.id, e.target.value)}
                  aria-label={p.name}
                />
                {p.unit ? <span className="w-14 text-xs text-muted-foreground">{p.unit}</span> : null}
              </div>
            )}
            <div className="@lg:min-h-6 @lg:min-w-24 @lg:text-right">
              {flag ? <FlagBadge flag={flag} /> : null}
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
