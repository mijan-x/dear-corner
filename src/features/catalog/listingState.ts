import { formatPrice } from "../../utils/formatPrice";

/**
 * Listing filters and sort, kept in the address bar so a filtered page can
 * be shared, reloaded or reached again with Back:
 *
 *   ?sort=price_asc&min=500&max=1000&color=Sage&color=Clay&stock=1&sale=1
 *   &cat=lighting (Shop all, collections, search) &q=lamp (search) &page=2
 */
export type SortKey =
  "featured" | "newest" | "price_asc" | "price_desc" | "discount" | "relevance";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
];

/** Search results add "Best match" and use it by default. */
export const SEARCH_SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Best match" },
  ...SORT_OPTIONS,
];

export const PAGE_SIZE = 24;

export type ListingKind = "shop" | "category" | "collection" | "search";

export type ListingFilters = {
  sort: SortKey;
  minPrice: number | null;
  maxPrice: number | null;
  colors: string[];
  inStock: boolean;
  onSale: boolean;
  /** Category filter on Shop all, collections and search. */
  category: string | null;
  query: string;
  /** How many pages of 24 are shown ("Load more"). */
  pages: number;
};

const SORTS = new Set<SortKey>([
  "featured",
  "newest",
  "price_asc",
  "price_desc",
  "discount",
  "relevance",
]);

function wholeTaka(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function defaultSort(kind: ListingKind): SortKey {
  return kind === "search" ? "relevance" : "featured";
}

export function readFilters(
  params: URLSearchParams,
  kind: ListingKind,
): ListingFilters {
  const sort = params.get("sort") as SortKey | null;
  const pages = Number(params.get("page"));
  return {
    sort:
      sort && SORTS.has(sort) && (sort !== "relevance" || kind === "search")
        ? sort
        : defaultSort(kind),
    minPrice: wholeTaka(params.get("min")),
    maxPrice: wholeTaka(params.get("max")),
    colors: [...new Set(params.getAll("color").filter(Boolean))].slice(0, 12),
    inStock: params.get("stock") === "1",
    onSale: params.get("sale") === "1",
    category: kind !== "category" ? params.get("cat") || null : null,
    query: kind === "search" ? (params.get("q") ?? "").trim().slice(0, 80) : "",
    pages: Number.isInteger(pages) && pages > 1 ? Math.min(pages, 20) : 1,
  };
}

/** Builds the query string; defaults are left out so URLs stay short. */
export function writeFilters(
  filters: ListingFilters,
  kind: ListingKind,
): URLSearchParams {
  const p = new URLSearchParams();
  if (kind === "search" && filters.query) p.set("q", filters.query);
  if (filters.category) p.set("cat", filters.category);
  if (filters.sort !== defaultSort(kind)) p.set("sort", filters.sort);
  if (filters.minPrice !== null) p.set("min", String(filters.minPrice));
  if (filters.maxPrice !== null) p.set("max", String(filters.maxPrice));
  filters.colors.forEach((c) => p.append("color", c));
  if (filters.inStock) p.set("stock", "1");
  if (filters.onSale) p.set("sale", "1");
  if (filters.pages > 1) p.set("page", String(filters.pages));
  return p;
}

export function activeFilterCount(f: ListingFilters): number {
  return (
    (f.category ? 1 : 0) +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    f.colors.length +
    (f.inStock ? 1 : 0) +
    (f.onSale ? 1 : 0)
  );
}

/** Quick price ranges offered next to the min/max fields. */
export const PRICE_RANGES: {
  label: string;
  min: number | null;
  max: number | null;
}[] = [
  { label: "Under ৳500", min: null, max: 499 },
  { label: "৳500 to ৳1,000", min: 500, max: 1000 },
  { label: "৳1,000 to ৳2,000", min: 1000, max: 2000 },
  { label: "Over ৳2,000", min: 2000, max: null },
];

/** "Under ৳500", "৳600 to ৳900", "From ৳600", "Up to ৳900". */
export function priceLabel(min: number | null, max: number | null): string {
  const preset = PRICE_RANGES.find((r) => r.min === min && r.max === max);
  if (preset) return preset.label;
  if (min !== null && max !== null)
    return `${formatPrice(min)} to ${formatPrice(max)}`;
  if (min !== null) return `From ${formatPrice(min)}`;
  if (max !== null) return `Up to ${formatPrice(max)}`;
  return "Any price";
}

/** "12 products" (or "Loading products" while the count is unknown). */
export function countText(total: number | undefined) {
  if (total === undefined) return "Loading products";
  return `${total} ${total === 1 ? "product" : "products"}`;
}
