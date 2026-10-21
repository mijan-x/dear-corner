import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";
import { toProductCard, type ProductCardData } from "../types/shop";
import {
  PAGE_SIZE,
  type ListingFilters,
  type ListingKind,
} from "../features/catalog/listingState";

type Row = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);

/** Header of a category or collection page (public.get_listing). */
export type ListingHeader = {
  kind: "category" | "collection";
  slug: string;
  name: string;
  intro: string;
  description: string;
  bannerDesktop: string | null;
  bannerMobile: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  parent: { slug: string; name: string } | null;
  /** Sub-categories of the main category (siblings on a sub-category page). */
  children: { slug: string; name: string }[];
};

/** Null when the category or collection doesn't exist or is hidden. */
export async function fetchListingHeader(
  kind: "category" | "collection",
  slug: string,
): Promise<ListingHeader | null> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("get_listing", { p_kind: kind, p_slug: slug });
  if (error) throw error;
  if (!data) return null;
  const d = data as Row;
  const parent = d.parent as Row | null;
  return {
    kind,
    slug: str(d.slug),
    name: str(d.name),
    intro: str(d.intro),
    description: str(d.description),
    bannerDesktop: strOrNull(d.banner_desktop),
    bannerMobile: strOrNull(d.banner_mobile),
    seoTitle: strOrNull(d.seo_title),
    seoDescription: strOrNull(d.seo_description),
    parent: parent ? { slug: str(parent.slug), name: str(parent.name) } : null,
    children: rows(d.children).map((c) => ({
      slug: str(c.slug),
      name: str(c.name),
    })),
  };
}

export function useListingHeader(kind: ListingKind, slug: string | undefined) {
  const key =
    (kind === "category" || kind === "collection") && slug
      ? `listing:${kind}:${slug}`
      : null;
  return useQuery(key, () =>
    fetchListingHeader(kind as "category" | "collection", slug ?? ""),
  );
}

/** What a listing shows before filters: a category, a collection, a search or everything. */
export type ListingScope = {
  category: string | null;
  collection: string | null;
  search: string | null;
};

export function listingScope(
  kind: ListingKind,
  slug: string | undefined,
  filters: ListingFilters,
): ListingScope {
  return {
    category: kind === "category" ? (slug ?? null) : filters.category,
    collection: kind === "collection" ? (slug ?? null) : null,
    search: kind === "search" ? filters.query || null : null,
  };
}

export type CatalogPage = { items: ProductCardData[]; total: number };

export async function fetchCatalogPage(
  scope: ListingScope,
  filters: ListingFilters,
  offset: number,
): Promise<CatalogPage> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("catalog_products", {
    p_category: scope.category ?? undefined,
    p_collection: scope.collection ?? undefined,
    p_search: scope.search ?? undefined,
    p_min_price: filters.minPrice ?? undefined,
    p_max_price: filters.maxPrice ?? undefined,
    p_colors: filters.colors.length ? filters.colors : undefined,
    p_in_stock: filters.inStock,
    p_on_sale: filters.onSale,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw error;
  const list = rows(data);
  return {
    items: list.map(toProductCard),
    total: list.length ? Number(list[0].total_count ?? list.length) : 0,
  };
}

/** Cache key for one page of 24 (everything that changes the result). */
export function catalogKey(
  scope: ListingScope,
  filters: ListingFilters,
  offset: number,
) {
  const { sort, minPrice, maxPrice, colors, inStock, onSale } = filters;
  return `catalog:${JSON.stringify({
    ...scope,
    sort,
    minPrice,
    maxPrice,
    colors,
    inStock,
    onSale,
    offset,
  })}`;
}

export function useCatalogPage(
  scope: ListingScope,
  filters: ListingFilters,
  offset: number,
  enabled = true,
) {
  return useQuery(
    enabled ? catalogKey(scope, filters, offset) : null,
    () => fetchCatalogPage(scope, filters, offset),
    { staleMs: 2 * 60_000 },
  );
}

/** Filter options with counts for the whole listing (before filters). */
export type Facets = {
  total: number;
  priceMin: number | null;
  priceMax: number | null;
  inStock: number;
  onSale: number;
  colors: { value: string; hex: string | null; count: number }[];
  categories: { slug: string; name: string; count: number }[];
};

export async function fetchFacets(scope: ListingScope): Promise<Facets> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("catalog_facets", {
    p_category: scope.category ?? undefined,
    p_collection: scope.collection ?? undefined,
    p_search: scope.search ?? undefined,
  });
  if (error) throw error;
  const d = (data ?? {}) as Row;
  const num = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    total: num(d.total) ?? 0,
    priceMin: num(d.price_min),
    priceMax: num(d.price_max),
    inStock: num(d.in_stock) ?? 0,
    onSale: num(d.on_sale) ?? 0,
    colors: rows(d.colors).map((c) => ({
      value: str(c.value),
      hex: strOrNull(c.hex),
      count: num(c.count) ?? 0,
    })),
    categories: rows(d.categories).map((c) => ({
      slug: str(c.slug),
      name: str(c.name),
      count: num(c.count) ?? 0,
    })),
  };
}

export function useFacets(scope: ListingScope, enabled = true) {
  return useQuery(
    enabled ? `facets:${JSON.stringify(scope)}` : null,
    () => fetchFacets(scope),
    { staleMs: 2 * 60_000 },
  );
}
