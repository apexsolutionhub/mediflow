import type { Medicine } from "@/lib/clinic";
import { LOOSE_UNIT_OPTIONS, MEDICINE_UNITS } from "@/lib/clinic";

/** Mirrors the backend stock rules so the screens read the same as the server decides. */
export type SaleUnit = "pack" | "loose";

type StockFields = Pick<
  Medicine,
  "on_hand" | "pack_size" | "loose_stock" | "loose_unit" | "unit_of_measure" | "unit_price" | "loose_price"
>;

export const packSize = (m: Pick<Medicine, "pack_size">) => Math.max(1, Number(m.pack_size) || 1);

/** A pack size above 1 means the medicine can also be sold by the loose unit. */
export const isSplittable = (m: Pick<Medicine, "pack_size">) => packSize(m) > 1;

export const unitLabel = (value?: string | null) =>
  MEDICINE_UNITS.find((u) => u.value === value)?.label ?? "Piece";

export const looseUnitLabel = (value?: string | null) =>
  LOOSE_UNIT_OPTIONS.find((u) => u.value === value)?.label ?? "Piece";

export const packName = (m: Pick<Medicine, "unit_of_measure">) => unitLabel(m.unit_of_measure).toLowerCase();

export const looseName = (m: Pick<Medicine, "loose_unit">) => (m.loose_unit || "piece").toLowerCase();

export function plural(word: string, count: number) {
  if (count === 1 || word === "ml" || word === "dozen" || word === "other") return word;
  if (/(x|s|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

/** "3 boxes", "1 tablet": a count with its unit word. */
export const countWord = (word: string, count: number) => `${count} ${plural(word, count)}`;

/** "3 boxes + 4 tablets", or just "3 boxes" when nothing is opened. */
export function stockText(m: StockFields): string {
  const packs = Number(m.on_hand || 0);
  const loose = Number(m.loose_stock || 0);
  const packText = countWord(packName(m), packs);
  if (!isSplittable(m) || !loose) return packText;
  const looseText = countWord(looseName(m), loose);
  return packs === 0 ? looseText : `${packText} + ${looseText}`;
}

/** Price of one loose unit: the loose price if set, else pack price / pack size. */
export function looseUnitPrice(m: StockFields): number {
  if (m.loose_price != null && m.loose_price !== "") return Number(m.loose_price);
  return Math.round((Number(m.unit_price) / packSize(m)) * 100) / 100;
}

export const unitPriceFor = (m: StockFields, saleUnit: SaleUnit = "pack") =>
  saleUnit === "loose" && isSplittable(m) ? looseUnitPrice(m) : Number(m.unit_price);

/** Everything on hand counted in loose units. */
export const looseCapacity = (m: StockFields) => Number(m.on_hand || 0) * packSize(m) + Number(m.loose_stock || 0);

/** The most that can be sold in the chosen unit. */
export const capacityFor = (m: StockFields, saleUnit: SaleUnit = "pack") =>
  saleUnit === "loose" && isSplittable(m) ? looseCapacity(m) : Number(m.on_hand || 0);

/** True when something can still be sold today, counting loose stock from an opened pack. */
export const hasStock = (m: StockFields) => Number(m.on_hand || 0) > 0 || Number(m.loose_stock || 0) > 0;

/** "boxes", "tablets": the unit word for a sale line. */
export const saleUnitWord = (m: StockFields, saleUnit: SaleUnit, count = 2) =>
  plural(saleUnit === "loose" ? looseName(m) : packName(m), count);
