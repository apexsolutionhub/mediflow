/** Default parallel fan-out for sequential-looking batch POSTs/PATCHes. */
export const CLINIC_BATCH_CONCURRENCY = 6;

export type PoolResult<T> = { ok: T[]; failed: string[] };

/**
 * Run async work over many items with a fixed concurrency cap.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = CLINIC_BATCH_CONCURRENCY,
): Promise<PoolResult<R>> {
  const ok: R[] = [];
  const failed: string[] = [];
  if (!items.length) return { ok, failed };

  let next = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        const item = items[i];
        try {
          ok.push(await fn(item, i));
        } catch (err: unknown) {
          const label =
            err instanceof Error ? err.message : String(err ?? "failed");
          const prefix =
            typeof item === "number" || typeof item === "string"
              ? `#${item}`
              : `line ${i + 1}`;
          failed.push(`${prefix}: ${label}`);
        }
      }
    }),
  );

  return { ok, failed };
}

export function formatPoolFailures(failed: string[], max = 5): string | undefined {
  if (!failed.length) return undefined;
  return failed.slice(0, max).join(" · ");
}

export function apiErrorDetail(error: unknown, fallback = "Request failed"): string {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return fallback;
}

export function newBatchLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function selectionState(
  targetIds: number[],
  selectedIds: number[],
): boolean | "indeterminate" {
  if (targetIds.length === 0) return false;
  const hit = targetIds.filter((id) => selectedIds.includes(id));
  if (hit.length === 0) return false;
  if (hit.length === targetIds.length) return true;
  return "indeterminate";
}

export function pruneSelectionToAllowed(
  selectedIds: number[],
  allowedIds: Set<number>,
): number[] {
  return selectedIds.filter((id) => allowedIds.has(id));
}
