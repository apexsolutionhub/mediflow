const KEY = "mediflow_selected_encounter_id";

export function setSelectedEncounterId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id == null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, String(id));
}

export function getSelectedEncounterId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
