export type ReviewTarget = "market" | "store";
export type ReviewCursor = { created_at: string; review_id: number };
export type CatalogReview = {
  review_id: number;
  stars: number;
  body: string;
  created_at: string;
  reviewer_name: string;
  verified_purchase: boolean;
  product_name: string | null;
};
export type CatalogReviewPage = {
  available: boolean;
  target_name: string | null;
  average: number;
  total: number;
  counts: Record<string, number>;
  filtered_count: number;
  items: CatalogReview[];
  next_cursor: ReviewCursor | null;
};

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid review response");
  return value as Record<string, unknown>;
};
const number = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid review number");
  return value;
};
const integer = (value: unknown) => {
  const parsed = number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("Invalid review integer");
  return parsed;
};
const timestamp = (value: unknown) => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Invalid review timestamp");
  // Keep the original precision for the database keyset cursor (microseconds).
  return value;
};

export function parseCatalogReviewPage(value: unknown): CatalogReviewPage {
  const row = object(value);
  const counts = object(row.counts);
  if (!Array.isArray(row.items) || typeof row.available !== "boolean") throw new Error("Invalid review page");
  const items = row.items.map((value): CatalogReview => {
    const item = object(value);
    const stars = integer(item.stars);
    const id = integer(item.review_id);
    if (!id || stars < 1 || stars > 5 || typeof item.body !== "string"
      || typeof item.reviewer_name !== "string" || typeof item.verified_purchase !== "boolean") {
      throw new Error("Invalid review item");
    }
    return { review_id: id, stars, body: item.body, created_at: timestamp(item.created_at),
      reviewer_name: item.reviewer_name, verified_purchase: item.verified_purchase,
      product_name: typeof item.product_name === "string" ? item.product_name : null };
  });
  let cursor: ReviewCursor | null = null;
  if (row.next_cursor !== null) {
    const raw = object(row.next_cursor);
    const id = integer(raw.review_id);
    if (!id) throw new Error("Invalid review cursor");
    cursor = { created_at: timestamp(raw.created_at), review_id: id };
  }
  const average = number(row.average);
  if (average > 5) throw new Error("Invalid review average");
  return { available: row.available, target_name: typeof row.target_name === "string" ? row.target_name : null,
    average, total: integer(row.total), filtered_count: integer(row.filtered_count),
    counts: Object.fromEntries([1, 2, 3, 4, 5].map((star) => [String(star), integer(counts[String(star)])])),
    items, next_cursor: cursor };
}

export function mergeCatalogReviews(previous: CatalogReview[], incoming: CatalogReview[]): CatalogReview[] {
  const ids = new Set(previous.map((item) => item.review_id));
  return [...previous, ...incoming.filter((item) => {
    if (ids.has(item.review_id)) return false;
    ids.add(item.review_id);
    return true;
  })];
}

export function reviewDateLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
}

export function parseReviewRoute(target: unknown, id: unknown): { targetType: ReviewTarget; targetId: number } | null {
  if ((target !== "market" && target !== "store") || typeof id !== "string" || !/^\d+$/.test(id)) return null;
  const targetId = Number(id);
  return Number.isSafeInteger(targetId) && targetId > 0 ? { targetType: target, targetId } : null;
}
