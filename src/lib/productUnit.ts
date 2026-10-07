export const PRODUCT_UNITS = [
  "ชิ้น", "กิโลกรัม", "กรัม", "ขวด", "แพ็ก", "ชุด", "กล่อง", "ถุง", "ลูก", "ก้อน",
] as const;

export type ProductUnitKind = (typeof PRODUCT_UNITS)[number] | string;
export const isWeightUnit = (kind: string) => kind === "กรัม" || kind === "กิโลกรัม";

/** Stock and order quantity count sale units, never loose grams/kilograms. */
export function formatSaleQuantity(quantity: number, unit: string | null | undefined): string {
  const saleUnit = unit?.trim() || "ชิ้น";
  const { amount, kind } = parseProductUnit(saleUnit);
  return amount && isWeightUnit(kind)
    ? `${quantity} ชุด (ชุดละ ${saleUnit})`
    : `${quantity} ${saleUnit}`;
}

export function parseProductUnit(unit: string): { kind: string; amount: string } {
  const trimmed = unit.trim();
  const weight = trimmed.match(/^(\d+(?:\.\d{1,3})?)\s*(กรัม|กิโลกรัม)$/);
  if (weight) return { kind: weight[2], amount: weight[1] };
  return { kind: trimmed || "ชิ้น", amount: "" };
}

export function normalizeWeightInput(value: string, kind: string): string {
  const digits = value.replace(",", ".").replace(kind === "กรัม" ? /[^\d]/g : /[^\d.]/g, "");
  if (kind === "กรัม") return digits.slice(0, 9);
  const [whole, ...fraction] = digits.split(".");
  return fraction.length ? `${whole.slice(0, 9)}.${fraction.join("").slice(0, 3)}` : whole.slice(0, 9);
}

export function formatProductUnit(kind: string, amount: string): { unit: string | null; error: string | null } {
  if (!kind.trim()) return { unit: null, error: "กรุณาเลือกหน่วยสินค้า" };
  if (!isWeightUnit(kind)) return { unit: kind.trim(), error: null };
  const normalized = amount.trim().replace(",", ".");
  const pattern = kind === "กรัม" ? /^\d+$/ : /^\d+(?:\.\d{1,3})?$/;
  if (!pattern.test(normalized) || Number(normalized) <= 0) {
    return { unit: null, error: kind === "กรัม"
      ? "กรุณากรอกจำนวนกรัมต่อ 1 หน่วยสั่งซื้อเป็นจำนวนเต็มมากกว่า 0"
      : "กรุณากรอกกิโลกรัมต่อ 1 หน่วยสั่งซื้อให้มากกว่า 0 และทศนิยมไม่เกิน 3 ตำแหน่ง" };
  }
  return { unit: `${Number(normalized)} ${kind}`, error: null };
}
