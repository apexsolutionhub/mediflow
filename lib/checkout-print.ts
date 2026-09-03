import { APEX_SOLUTION, MEDIFLOW_SYSTEM } from "@/constants/branding";
import type { Appointment, ClinicalOrder, Encounter } from "@/lib/clinic";

export type CheckoutPrintPayload = Encounter & {
  external_prescriptions?: {
    id: number;
    details: string;
    medicine_name?: string;
  }[];
  follow_up_appointments?: Appointment[];
  referrals?: {
    id: number;
    to_department?: string;
    to_branch?: string;
    diagnosis?: string;
    lab_summary?: string;
  }[];
};

export type CheckoutPrintClinic = {
  clinicName: string;
  clinicTin?: string;
  branchName?: string;
  logoUrl?: string;
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

function money(value: string | number | undefined | null) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isExternalRx(order: ClinicalOrder) {
  return (
    order.order_type === "prescription" &&
    String(order.fulfillment || "").includes("external")
  );
}

function isClinicRx(order: ClinicalOrder) {
  return order.order_type === "prescription" && !isExternalRx(order);
}

function section(title: string, bodyHtml: string) {
  if (!bodyHtml.trim()) return "";
  return `<section class="sec"><h2>${escapeHtml(title)}</h2>${bodyHtml}</section>`;
}

function emptyLine(text: string) {
  return `<p class="muted">${escapeHtml(text)}</p>`;
}

function listItems(items: string[]) {
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
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
    .sheet { min-height: 100vh; display: flex; flex-direction: column; page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
    .sheet-body { flex: 1; padding: 0 0 16px; }
    .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
      border-bottom: 2px solid #12305f; padding-bottom: 12px; margin-bottom: 16px; }
    .clinic-mark { display: flex; gap: 12px; align-items: center; min-width: 0; }
    .clinic-logo { height: 44px; width: auto; max-width: 120px; object-fit: contain; border-radius: 8px; }
    .clinic-name { margin: 0; font-size: 18px; font-weight: 800; color: #12305f; letter-spacing: 0.02em; }
    .clinic-meta { margin: 2px 0 0; font-size: 11px; color: #5b6b82; }
    .doc-title { margin: 0; text-align: right; font-size: 16px; font-weight: 700; color: #12305f; }
    .doc-sub { margin: 4px 0 0; text-align: right; font-size: 11px; color: #5b6b82; }
    .kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #e8951e; margin: 0 0 4px; }
    .sec { margin: 14px 0; padding: 12px 14px; border: 1px solid #d7e0ec; border-radius: 12px; background: #fbfcfe; break-inside: avoid; }
    .sec h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #12305f; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #5b6b82; margin: 0 0 2px; }
    .value { margin: 0; font-size: 13px; line-height: 1.45; }
    .muted { margin: 0; font-size: 12px; color: #5b6b82; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; font-size: 13px; line-height: 1.45; }
    .rx-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin: 8px 0; background: #fff; }
    .rx-name { margin: 0; font-weight: 700; color: #12305f; }
    .rx-meta { margin: 4px 0 0; font-size: 12px; color: #475569; white-space: pre-wrap; }
    .note { margin-top: 12px; padding: 10px 12px; border-radius: 10px; border: 1px dashed #e8951e; background: #fff8eb; font-size: 12px; color: #7a4b00; }
    .apex-footer { margin-top: auto; display: flex; justify-content: space-between; gap: 16px; align-items: center;
      background: #09090b; color: #fff; border-radius: 12px; padding: 12px 14px; break-inside: avoid; page-break-inside: avoid; }
    .apex-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .apex-logo { height: 40px; width: auto; max-width: 140px; object-fit: contain; }
    .apex-name { margin: 0; font-size: 13px; font-weight: 700; }
    .apex-site { margin: 2px 0 0; font-size: 11px; color: #a1a1aa; }
    .apex-right { text-align: right; font-size: 11px; color: #d4d4d8; line-height: 1.4; }
    .apex-right strong { color: #fff; }
    .apex-time { margin: 2px 0 0; font-variant-numeric: tabular-nums; color: #a1a1aa; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .apex-footer { border-radius: 0; }
    }
  </style>`;
}

function clinicHeaderHtml(clinic: CheckoutPrintClinic, title: string, subtitle: string) {
  const logoUrl = absoluteUrl(clinic.logoUrl);
  const logo = logoUrl
    ? `<img class="clinic-logo" src="${escapeHtml(logoUrl)}" alt="" />`
    : `<div class="clinic-logo" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;background:#12305f;color:#fff;font-weight:800;border-radius:10px">MF</div>`;
  const meta = [clinic.branchName, clinic.clinicTin ? `TIN ${clinic.clinicTin}` : ""]
    .filter(Boolean)
    .join(" · ");
  return `<header class="head">
    <div class="clinic-mark">
      ${logo}
      <div>
        <p class="clinic-name">${escapeHtml(clinic.clinicName || "Clinic")}</p>
        ${meta ? `<p class="clinic-meta">${escapeHtml(meta)}</p>` : ""}
      </div>
    </div>
    <div>
      <p class="kicker">${escapeHtml(MEDIFLOW_SYSTEM.name)}</p>
      <p class="doc-title">${escapeHtml(title)}</p>
      <p class="doc-sub">${escapeHtml(subtitle)}</p>
    </div>
  </header>`;
}

function buildHealthReportBody(data: CheckoutPrintPayload) {
  const patient = data.patient;
  const chart = data.chart;
  const orders = data.orders || [];
  const lab = orders.filter((o) => o.order_type === "lab");
  const radiology = orders.filter((o) => o.order_type === "radiology");
  const clinicRx = orders.filter(isClinicRx);
  const externalRx = data.external_prescriptions?.length
    ? data.external_prescriptions
    : orders.filter(isExternalRx).map((o) => ({
        id: o.id,
        details: o.details,
        medicine_name: o.details?.split(" · ")[0] || "Medicine",
      }));
  const appointments = data.follow_up_appointments || [];
  const referrals = data.referrals || [];
  const payments = data.payments || [];
  const nurseNotes = data.nurse_notes || [];

  const patientHtml = `<div class="grid2">
    <div><p class="label">Patient</p><p class="value">${escapeHtml(patient?.full_name || "—")}</p></div>
    <div><p class="label">MRN</p><p class="value">${escapeHtml(patient?.mrn || "—")}</p></div>
    <div><p class="label">Visit</p><p class="value">${escapeHtml(data.number || "—")}</p></div>
    <div><p class="label">Checked out</p><p class="value">${escapeHtml(formatWhen(data.closed_at || new Date().toISOString()))}</p></div>
    ${patient?.age != null ? `<div><p class="label">Age</p><p class="value">${escapeHtml(String(patient.age))}</p></div>` : ""}
    ${patient?.gender ? `<div><p class="label">Gender</p><p class="value">${escapeHtml(patient.gender)}</p></div>` : ""}
    ${patient?.phone ? `<div><p class="label">Phone</p><p class="value">${escapeHtml(patient.phone)}</p></div>` : ""}
    ${patient?.allergies ? `<div><p class="label">Allergies</p><p class="value">${escapeHtml(patient.allergies)}</p></div>` : ""}
  </div>`;

  const chartHtml = chart
    ? `<div class="grid2">
        ${chart.chief_complaint ? `<div><p class="label">Chief complaint</p><p class="value">${nl(chart.chief_complaint)}</p></div>` : ""}
        ${chart.diagnosis ? `<div><p class="label">Diagnosis</p><p class="value"><strong>${nl(chart.diagnosis)}</strong></p></div>` : ""}
        ${chart.examination ? `<div style="grid-column:1/-1"><p class="label">Examination</p><p class="value">${nl(chart.examination)}</p></div>` : ""}
        ${chart.clinical_notes ? `<div style="grid-column:1/-1"><p class="label">Clinical notes</p><p class="value">${nl(chart.clinical_notes)}</p></div>` : ""}
        ${chart.treatment_plan ? `<div style="grid-column:1/-1"><p class="label">Treatment plan</p><p class="value">${nl(chart.treatment_plan)}</p></div>` : ""}
      </div>`
    : emptyLine("No clinical chart recorded for this visit.");

  const nurseHtml = nurseNotes.length
    ? listItems(
        nurseNotes.map((n) => {
          const vitals =
            n.vitals && typeof n.vitals === "object"
              ? Object.entries(n.vitals)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
              : "";
          return `<strong>${escapeHtml(n.note_type || "Note")}</strong> — ${nl(n.content || "")}${
            vitals ? `<br/><span class="muted">${escapeHtml(vitals)}</span>` : ""
          }`;
        }),
      )
    : emptyLine("No nurse notes for this visit.");

  const diagHtml = (rows: ClinicalOrder[], empty: string) =>
    rows.length
      ? listItems(
          rows.map((o) => {
            const result = o.result_text
              ? `<br/><span class="muted">Result: ${nl(o.result_text)}</span>`
              : `<br/><span class="muted">Status: ${escapeHtml(o.status)}</span>`;
            return `<strong>${escapeHtml(o.details || o.order_type)}</strong>${result}`;
          }),
        )
      : emptyLine(empty);

  const clinicRxHtml = clinicRx.length
    ? clinicRx
        .map(
          (o) => `<div class="rx-card"><p class="rx-name">${escapeHtml(
            o.details?.split(" · ")[0] || "Medicine",
          )}</p><p class="rx-meta">${nl(o.details || "")}</p>
          <p class="muted">Clinic pharmacy · ${escapeHtml(o.status)}</p></div>`,
        )
        .join("")
    : emptyLine("No clinic-pharmacy medicines on this visit.");

  const apptHtml = appointments.length
    ? listItems(
        appointments.map(
          (a) =>
            `<strong>${escapeHtml(formatWhen(a.scheduled_at))}</strong>${
              a.reason ? ` — ${escapeHtml(a.reason)}` : ""
            }`,
        ),
      )
    : emptyLine("No follow-up appointment scheduled.");

  const referralHtml = referrals.length
    ? listItems(
        referrals.map((r) => {
          const bits = [r.to_department, r.to_branch, r.diagnosis].filter(Boolean);
          return `${escapeHtml(bits.join(" · ") || "Referral")}${
            r.lab_summary ? `<br/><span class="muted">${nl(r.lab_summary)}</span>` : ""
          }`;
        }),
      )
    : emptyLine("No referrals recorded.");

  const payHtml = payments.length
    ? listItems(
        payments.map(
          (p) =>
            `${escapeHtml(p.receipt_number || "Receipt")} · ${money(p.amount)} ETB · ${escapeHtml(
              p.tender_method || "",
            )}`,
        ),
      )
    : emptyLine("No payments recorded on this visit.");

  const externalNote = externalRx.length
    ? `<div class="note"><strong>${externalRx.length} outside-pharmacy medicine${
        externalRx.length === 1 ? "" : "s"
      }</strong> are printed on a separate prescription sheet for the patient to take to an external pharmacy.</div>`
    : "";

  return [
    section("Patient & visit", patientHtml),
    section("Clinical assessment", chartHtml),
    section("Nursing notes & vitals", nurseHtml),
    section("Laboratory", diagHtml(lab, "No laboratory orders.")),
    section("Radiology", diagHtml(radiology, "No radiology orders.")),
    section("Clinic pharmacy medicines", clinicRxHtml),
    section("Follow-up appointments", apptHtml),
    section("Referrals", referralHtml),
    section("Payments", payHtml),
    externalNote,
  ].join("");
}

function buildExternalRxBody(data: CheckoutPrintPayload) {
  const patient = data.patient;
  const external =
    data.external_prescriptions?.length
      ? data.external_prescriptions
      : (data.orders || [])
          .filter(isExternalRx)
          .map((o) => ({
            id: o.id,
            details: o.details,
            medicine_name: o.details?.split(" · ")[0] || "Medicine",
          }));

  const head = `<div class="grid2">
    <div><p class="label">Patient</p><p class="value">${escapeHtml(patient?.full_name || "—")}</p></div>
    <div><p class="label">MRN</p><p class="value">${escapeHtml(patient?.mrn || "—")}</p></div>
    <div><p class="label">Visit</p><p class="value">${escapeHtml(data.number || "—")}</p></div>
    <div><p class="label">Printed</p><p class="value">${escapeHtml(new Date().toLocaleString())}</p></div>
  </div>
  <p class="note" style="margin-top:12px">Take this prescription to an outside pharmacy. These medicines are not dispensed from the clinic pharmacy.</p>`;

  const lines = external
    .map(
      (rx, index) => `<div class="rx-card">
        <p class="rx-name">${index + 1}. ${escapeHtml(rx.medicine_name || "Medicine")}</p>
        <p class="rx-meta">${nl(rx.details || "")}</p>
      </div>`,
    )
    .join("");

  return section("Outside pharmacy medicines", head + lines);
}

function openPrintWindow(html: string, title: string) {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank", "noopener,noreferrer,width=820,height=1000");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  // Wait for logo images before printing.
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };
  const imgs = Array.from(win.document.images || []);
  if (!imgs.length) {
    win.onload = trigger;
    setTimeout(trigger, 250);
    return true;
  }
  let left = imgs.length;
  const done = () => {
    left -= 1;
    if (left <= 0) trigger();
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
  setTimeout(trigger, 1500);
  return true;
}

/**
 * Prints the visit health report always.
 * When outside-pharmacy medicines exist, appends a second receipt page
 * (same print job, separate physical sheet) — both include Apex footer branding.
 */
export function printCheckoutDocuments(
  data: CheckoutPrintPayload,
  clinic: CheckoutPrintClinic,
): { printed: boolean; dual: boolean } {
  const externalCount =
    data.external_prescriptions?.length ||
    (data.orders || []).filter(isExternalRx).length;
  const dual = externalCount > 0;

  const healthSheet = `<div class="sheet">
    <div class="sheet-body">
      ${clinicHeaderHtml(
        clinic,
        "Overall health report",
        `Visit ${data.number || ""} · ${patientLabel(data)}`,
      )}
      ${buildHealthReportBody(data)}
    </div>
    ${apexFooterHtml("Visit health summary")}
  </div>`;

  const rxSheet = dual
    ? `<div class="sheet">
    <div class="sheet-body">
      ${clinicHeaderHtml(
        clinic,
        "Outside pharmacy prescription",
        `Visit ${data.number || ""} · ${patientLabel(data)}`,
      )}
      ${buildExternalRxBody(data)}
    </div>
    ${apexFooterHtml("External prescription")}
  </div>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${
    dual ? "Health report & external prescription" : "Health report"
  }</title>${printStyles()}</head><body>${healthSheet}${rxSheet}</body></html>`;

  const printed = openPrintWindow(
    html,
    dual ? "Health report & external Rx" : "Health report",
  );
  return { printed, dual };
}

function patientLabel(data: CheckoutPrintPayload) {
  return data.patient?.full_name || "Patient";
}
