export const CATALOG_SORT_OPTIONS = [
  { value: "distance", label: "ใกล้ที่สุด" },
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "price_asc", label: "ราคาต่ำ → สูง" },
  { value: "price_desc", label: "ราคาสูง → ต่ำ" },
] as const;

export type CatalogSort = typeof CATALOG_SORT_OPTIONS[number]["value"];
