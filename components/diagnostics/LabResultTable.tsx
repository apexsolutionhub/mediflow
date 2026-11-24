import type { OrderResultValue, ResultFlag } from "@/lib/clinic";
import { cn } from "@/lib/utils";

const FLAG_LABEL: Record<ResultFlag, string> = {
  normal: "Normal",
  low: "Low",
  high: "High",
  critical: "Critical",
  abnormal: "Abnormal",
};

const FLAG_CLASS: Record<ResultFlag, string> = {
  normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low: "bg-amber-50 text-amber-800 ring-amber-200",
  high: "bg-amber-50 text-amber-800 ring-amber-200",
  abnormal: "bg-orange-50 text-orange-800 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-300",
};

export function FlagBadge({ flag }: { flag: ResultFlag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        FLAG_CLASS[flag] ?? FLAG_CLASS.normal,
      )}
    >
      {flag === "low" ? "▼ " : flag === "high" ? "▲ " : flag === "critical" ? "‼ " : ""}
      {FLAG_LABEL[flag] ?? flag}
    </span>
  );
}

export function LabResultTable({ values }: { values: OrderResultValue[] }) {
  if (!values.length) return null;
  return (
    <div className="@container">
      {/* Narrow: one compact row per result so nothing is clipped or squeezed. */}
      <ul className="divide-y divide-primary/8 overflow-hidden rounded-xl border border-primary/10 bg-white @md:hidden">
        {values.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-medium text-primary">{v.name}</p>
              {v.reference_text ? (
                <p className="text-[11px] text-muted-foreground">
                  Ref {v.reference_text} {v.unit}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  "text-sm font-semibold whitespace-nowrap tabular-nums",
                  v.flag !== "normal" ? "text-red-700" : "text-primary",
                )}
              >
                {v.value} {v.unit}
              </span>
              <FlagBadge flag={v.flag} />
            </div>
          </li>
        ))}
      </ul>

      {/* Wide: full table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-primary/10 bg-white @md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/10 bg-(--role)/6 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <th className="px-3 py-2">Test</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v) => (
              <tr key={v.id} className="border-b border-primary/5 last:border-0">
                <td className="px-3 py-2 font-medium text-primary">{v.name}</td>
                <td
                  className={cn(
                    "px-3 py-2 whitespace-nowrap tabular-nums",
                    v.flag !== "normal" && "font-bold text-red-700",
                  )}
                >
                  {v.value} {v.unit}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                  {v.reference_text || "—"} {v.reference_text ? v.unit : ""}
                </td>
                <td className="px-3 py-2">
                  <FlagBadge flag={v.flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function resultValuesToHtml(values: OrderResultValue[], esc: (s: string) => string) {
  const rows = values
    .map(
      (v) =>
        `<tr><td>${esc(v.name)}</td><td${v.flag !== "normal" ? ' style="font-weight:700;color:#b91c1c"' : ""}>${esc(v.value)} ${esc(v.unit || "")}</td><td>${esc(v.reference_text || "")} ${v.reference_text ? esc(v.unit || "") : ""}</td><td>${v.flag === "normal" ? "" : esc(FLAG_LABEL[v.flag] ?? v.flag)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:13px" border="0" cellpadding="6"><thead><tr style="text-align:left;color:#5b6b82"><th>Test</th><th>Result</th><th>Reference</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>`;
}
