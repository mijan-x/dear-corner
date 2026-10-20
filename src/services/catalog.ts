import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";
import {
  toStorefrontNav,
  type CardImage,
  type StorefrontNav,
} from "../types/shop";

/**
 * The menu used until the database answers (and if it can't): the five
 * categories and the New arrivals collection, same slugs as the database.
 */
export const FALLBACK_NAV: StorefrontNav = {
  categories: [
    { slug: "room-decor", name: "Room decor", image: null, children: [] },
    { slug: "lighting", name: "Lighting", image: null, children: [] },
    {
      slug: "desk-and-stationery",
      name: "Desk and stationery",
      image: null,
      children: [],
    },
    { slug: "accessories", name: "Accessories", image: null, children: [] },
    { slug: "gifts", name: "Gifts", image: null, children: [] },
  ],
  collections: [{ slug: "new-arrivals", name: "New arrivals" }],
};

export async function fetchStorefrontNav(): Promise<StorefrontNav> {
  const { data, error } = await (await getSupabase()).rpc("storefront_nav");
  if (error) throw error;
  const nav = toStorefrontNav(data);
  return nav.categories.length ? nav : FALLBACK_NAV;
}

export function useStorefrontNav() {
  const query = useQuery("storefront-nav", fetchStorefrontNav, {
    persist: true,
  });
  return query.data ?? FALLBACK_NAV;
}

export type SearchSuggestions = {
  products: {
    slug: string;
    name: string;
    priceMin: number;
    priceMax: number;
    compareAtPrice: number | null;
    image: CardImage | null;
    soldOut: boolean;
  }[];
  categories: { slug: string; name: string }[];
};

type Row = Record<string, unknown>;

/** Search-as-you-type: up to 5 products and 3 categories. */
export async function fetchSearchSuggestions(
  query: string,
): Promise<SearchSuggestions> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("search_suggestions", {
    p_query: query,
  });
  if (error) throw error;
  const d = (data ?? {}) as Row;
  const products = Array.isArray(d.products) ? (d.products as Row[]) : [];
  const categories = Array.isArray(d.categories) ? (d.categories as Row[]) : [];
  return {
    products: products.map((p) => {
      const image = (p.image ?? null) as Row | null;
      return {
        slug: String(p.slug ?? ""),
        name: String(p.name ?? ""),
        priceMin: Number(p.price_min ?? 0),
        priceMax: Number(p.price_max ?? p.price_min ?? 0),
        compareAtPrice:
          typeof p.compare_at_price === "number" ? p.compare_at_price : null,
        image: image
          ? {
              path: String(image.path ?? ""),
              thumb: String(image.thumb ?? image.path ?? ""),
              alt: String(image.alt ?? ""),
            }
          : null,
        soldOut: p.sold_out === true,
      };
    }),
    categories: categories.map((c) => ({
      slug: String(c.slug ?? ""),
      name: String(c.name ?? ""),
    })),
  };
}
