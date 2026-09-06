import { APEX_SOLUTION, MEDIFLOW_SYSTEM } from "@/constants/branding";

export type ReferralPrintRow = {
  id: number;
  destination_kind?: string;
  to_department?: string;
  to_branch?: string;
  external_institution?: string;
  diagnosis?: string;
  lab_summary?: string;
  approval_status?: string;
  approved_at?: string | null;
  created_at?: string;
  patient_name?: string;
  encounter_number?: string;
  created_by_name?: string;
};

export type ReferralPrintClinic = {
  clinicName: string;
  clinicTin?: string;
  branchName?: string;
  logoUrl?: string;
  opsMode?: string;
};

function absoluteUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  if (typeof window === "undefined") return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nl(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br/>");
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function destinationLabel(row: ReferralPrintRow) {
  const kind = (row.destination_kind || "internal").toLowerCase();
  if (kind === "external") {
    const inst = (row.external_institution || "").trim();
    return inst
      ? `Outside organization · ${inst}`
      : "Outside organization (institution not specified)";
  }
  const branch = (row.to_branch || "").trim() || "—";
  const dept = (row.to_department || "").trim() || "—";
  return `Same organization · ${branch} / ${dept}`;
}

function apexFooterHtml(rightNote: string) {
  const site = APEX_SOLUTION.website.replace(/^https?:\/\//, "");
  const logoSrc = absoluteUrl(APEX_SOLUTION.logoPath);
  return `<footer class="apex-footer">
    <div class="apex-left">
      <img src="${logoSrc}" alt="${escapeHtml(APEX_SOLUTION.name)}" class="apex-logo" />
      <div>
        <p class="apex-name">${escapeHtml(APEX_SOLUTION.name)}</p>
        <p class="apex-site">${escapeHtml(site)}</p>
      </div>
    </div>
    <div class="apex-right">
      <p>Powered by <strong>${escapeHtml(MEDIFLOW_SYSTEM.name)}</strong></p>
      <p>${escapeHtml(rightNote)}</p>
      <p class="apex-time">${escapeHtml(new Date().toLocaleString())}</p>
    </div>
  </footer>`;
}

function printStyles() {
  return `<style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: #0f1c2e; background: #fff; }
    .sheet { min-height: 100vh; display: flex; flex-direction: column; }
    .sheet-body { flex: 1; padding: 0 0 16px; }
    .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
      border-bottom: 2px solid #12305f; padding-bottom: 12px; margin-bottom: 16px; }
    .clinic-mark { display: flex; gap: 12px; align-items: center; min-width: 0; }
    .clinic-logo { height: 44px; width: auto; max-width: 120px; object-fit: contain; border-radius: 8px; }
    .clinic-name { margin: 0; font-size: 18px; font-weight: 800; color: #12305f; }
    .clinic-meta { margin: 2px 0 0; font-size: 11px; color: #5b6b82; }
    .doc-title { margin: 0; text-align: right; font-size: 16px; font-weight: 700; color: #12305f; }
    .doc-sub { margin: 4px 0 0; text-align: right; font-size: 11px; color: #5b6b82; }
    .kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #e8951e; margin: 0 0 4px; }
    .sec { margin: 0 0 14px; padding: 12px 14px; border: 1px solid #d7dee8; border-radius: 12px; background: #f8fafc; }
    .sec h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #12305f; }
    .row { display: grid; grid-template-columns: 140px 1fr; gap: 8px; font-size: 13px; margin: 0 0 6px; }
    .label { color: #5b6b82; font-weight: 600; }
    .value { color: #0f1c2e; }
    .note { font-size: 12px; color: #5b6b82; margin: 10px 0 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .apex-footer { margin-top: auto; display: flex; justify-content: space-between; gap: 16px; align-items: center;
      padding: 12px 14px; border-radius: 12px; background: #0f1c2e; color: #e8eef7; }
    .apex-left { display: flex; gap: 10px; align-items: center; min-width: 0; }
    .apex-logo { height: 40px; width: auto; max-width: 140px; object-fit: contain; }
    .apex-name { margin: 0; font-size: 13px; font-weight: 700; }
    .apex-site { margin: 2px 0 0; font-size: 11px; opacity: 0.8; }
    .apex-right { text-align: right; font-size: 11px; line-height: 1.45; opacity: 0.92; }
    .apex-time { margin: 4px 0 0; opacity: 0.7; }
  </style>`;
}

/**
 * Prints a manager-approved referral slip (same-org or outside).
 * Used by reception after approval; offline / outside referrals are the first-hand handoff document.
 */
export function printReferralSlip(row: ReferralPrintRow, clinic: ReferralPrintClinic) {
  if ((row.approval_status || "").toLowerCase() !== "approved") {
    throw new Error("Referral must be manager-approved before printing.");
  }

  const logo = absoluteUrl(clinic.logoUrl);
  const ops = (clinic.opsMode || "online").toLowerCase();
  const isOffline = ops === "offline" || ops === "offline_sync" || ops === "hybrid";
  const kind = (row.destination_kind || "internal").toLowerCase();
  const handoffNote =
    kind === "external" || isOffline
      ? "First-hand referral document for the receiving facility / patient handoff."
      : "Online clinic — manager approval completed before this print.";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Referral ${escapeHtml(
    String(row.id),
  )}</title>${printStyles()}</head><body>
  <div class="sheet">
    <div class="sheet-body">
      <header class="head">
        <div class="clinic-mark">
          ${logo ? `<img src="${logo}" alt="" class="clinic-logo" />` : ""}
          <div>
            <p class="kicker">Patient referral</p>
            <p class="clinic-name">${escapeHtml(clinic.clinicName || "Clinic")}</p>
            <p class="clinic-meta">${escapeHtml(
              [clinic.branchName, clinic.clinicTin ? `TIN ${clinic.clinicTin}` : ""]
                .filter(Boolean)
                .join(" · "),
            )}</p>
          </div>
        </div>
        <div>
          <p class="doc-title">Referral slip</p>
          <p class="doc-sub">#${escapeHtml(String(row.id))} · ${escapeHtml(
            formatWhen(row.created_at),
          )}</p>
          <p class="doc-sub"><span class="badge">Manager approved</span></p>
        </div>
      </header>

      <section class="sec">
        <h2>Patient</h2>
        <div class="row"><div class="label">Name</div><div class="value">${escapeHtml(
          row.patient_name || "—",
        )}</div></div>
        <div class="row"><div class="label">Visit</div><div class="value">${escapeHtml(
          row.encounter_number || "—",
        )}</div></div>
        <div class="row"><div class="label">Ordered by</div><div class="value">${escapeHtml(
          row.created_by_name || "—",
        )}</div></div>
        <div class="row"><div class="label">Approved</div><div class="value">${escapeHtml(
          formatWhen(row.approved_at),
        )}</div></div>
      </section>

      <section class="sec">
        <h2>Destination</h2>
        <div class="row"><div class="label">Route</div><div class="value">${escapeHtml(
          destinationLabel(row),
        )}</div></div>
        ${
          kind === "internal" && row.to_department
            ? `<div class="row"><div class="label">Department</div><div class="value">${escapeHtml(
                row.to_department,
              )}</div></div>`
            : ""
        }
        <p class="note">${escapeHtml(handoffNote)}</p>
      </section>

      <section class="sec">
        <h2>Clinical summary</h2>
        <div class="row"><div class="label">Diagnosis</div><div class="value">${nl(
          row.diagnosis || "—",
        )}</div></div>
        <div class="row"><div class="label">Lab / imaging</div><div class="value">${nl(
          row.lab_summary || "—",
        )}</div></div>
      </section>
    </div>
    ${apexFooterHtml("Referral receipt")}
  </div>
  <script>window.onload=()=>{window.print();};</script>
  </body></html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!win) throw new Error("Pop-up blocked — allow pop-ups to print.");
  win.document.open();
  win.document.write(html);
  win.document.close();
}
