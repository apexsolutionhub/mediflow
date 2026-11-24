"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import type { RadiologyReport, ReportTag } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export type RadiologyDraft = {
  technique: string;
  findings: string;
  impression: string;
  tag: ReportTag | "";
  attachments: { url: string; name: string }[];
};

export const emptyRadiologyDraft = (): RadiologyDraft => ({
  technique: "",
  findings: "",
  impression: "",
  tag: "",
  attachments: [],
});

export const isRadiologyDraftComplete = (d: RadiologyDraft | undefined) =>
  Boolean(d && d.findings.trim() && d.impression.trim() && d.tag);

const TAG_SELECTED: Record<ReportTag, string> = {
  normal: "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25",
  abnormal: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25",
  critical: "border-red-600 bg-red-600 text-white shadow-md shadow-red-600/25",
};

const TAG_EDGE: Record<ReportTag, string> = {
  normal: "border-l-emerald-500",
  abnormal: "border-l-amber-500 bg-amber-50/40",
  critical: "border-l-red-600 bg-red-50/50",
};

const TAG_CLASS: Record<ReportTag, string> = {
  normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  abnormal: "bg-orange-50 text-orange-800 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-300",
};

export function ReportTagBadge({ tag }: { tag: ReportTag }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1",
        TAG_CLASS[tag] ?? TAG_CLASS.normal,
      )}
    >
      {tag}
    </span>
  );
}

const areaClass =
  "min-h-20 w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-cta/20";

export function RadiologyReportForm({
  draft,
  onChange,
}: {
  draft: RadiologyDraft;
  onChange: (next: RadiologyDraft) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = isCloudinaryConfigured();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (draft.attachments.length + files.length > 10) {
      toast.error("At most 10 images per report");
      return;
    }
    setUploading(true);
    try {
      const added: { url: string; name: string }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        const url = await uploadImageToCloudinary(file, { folder: "mediflow/radiology" });
        added.push({ url, name: file.name });
      }
      onChange({ ...draft, attachments: [...draft.attachments, ...added] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-primary/80">
        Technique (optional)
        <textarea
          className={cn(areaClass, "mt-1 min-h-14")}
          placeholder="e.g. Chest PA erect, no contrast"
          value={draft.technique}
          onChange={(e) => onChange({ ...draft, technique: e.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-primary/80">
        Findings
        <textarea
          className={cn(areaClass, "mt-1")}
          value={draft.findings}
          onChange={(e) => onChange({ ...draft, findings: e.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-primary/80">
        Impression
        <textarea
          className={cn(areaClass, "mt-1 min-h-14")}
          placeholder="One-line conclusion"
          value={draft.impression}
          onChange={(e) => onChange({ ...draft, impression: e.target.value })}
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-primary/80">Overall result</p>
        <div className="flex flex-wrap gap-1.5">
          {(["normal", "abnormal", "critical"] as const).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange({ ...draft, tag })}
              className={cn(
                "rounded-lg border px-4 py-1.5 text-sm font-medium capitalize transition",
                draft.tag === tag
                  ? TAG_SELECTED[tag]
                  : "border-slate-200 bg-white text-primary hover:border-(--role)/40 hover:bg-(--role)/6",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-primary/80">Images (optional)</p>
        <div className="flex flex-wrap gap-2">
          {draft.attachments.map((a, i) => (
            <div key={a.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="size-20 rounded-lg border object-cover" />
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-red-600 text-white"
                onClick={() =>
                  onChange({
                    ...draft,
                    attachments: draft.attachments.filter((_, idx) => idx !== i),
                  })
                }
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading || !canUpload}
            onClick={() => fileRef.current?.click()}
            className="inline-flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-(--role)/40 text-xs text-primary/70 transition-colors hover:bg-(--role)/8 disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
            {uploading ? "Uploading…" : "Add"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
        </div>
        {!canUpload ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Image upload is not configured (Cloudinary env vars missing).
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RadiologyReportView({ report }: { report: RadiologyReport }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-l-4 border-primary/10 bg-white p-3.5 text-sm",
        TAG_EDGE[report.tag] ?? TAG_EDGE.normal,
      )}
    >
      <div className="flex items-center gap-2">
        <ReportTagBadge tag={report.tag} />
      </div>
      {report.technique ? (
        <Section label="Technique" text={report.technique} />
      ) : null}
      <Section label="Findings" text={report.findings} />
      <Section label="Impression" text={report.impression} strong />
      {report.attachments?.length ? (
        <div className="flex flex-wrap gap-2">
          {report.attachments.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="size-24 rounded-lg border object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Section({ label, text, strong }: { label: string; text: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-(--role-ink) uppercase">{label}</p>
      <p className={cn("mt-0.5 whitespace-pre-wrap leading-6", strong ? "font-semibold text-primary" : "text-primary/90")}>
        {text}
      </p>
    </div>
  );
}

export function radiologyReportToHtml(report: RadiologyReport, esc: (s: string) => string) {
  const block = (label: string, text: string) =>
    `<div class="box"><div class="label">${label}</div><p>${esc(text).replaceAll("\n", "<br/>")}</p></div>`;
  const images = (report.attachments ?? [])
    .map((a) => `<img src="${esc(a.url)}" style="width:160px;margin:4px;border-radius:8px"/>`)
    .join("");
  return (
    block("Overall result", report.tag.toUpperCase()) +
    (report.technique ? block("Technique", report.technique) : "") +
    block("Findings", report.findings) +
    block("Impression", report.impression) +
    (images ? `<div class="box">${images}</div>` : "")
  );
}
