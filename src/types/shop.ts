import type { Json } from "./database";

/** Shapes the storefront works with, mapped from the database's JSON. */

export type CardImage = {
  path: string;
  thumb: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

export type Swatch = { value: string; hex: string | null };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  priceMin: number;
  priceMax: number;
  /** Old price of the cheapest variant, only when it is on sale. */
  compareAtPrice: number | null;
  discountPercent: number;
  images: CardImage[];
  swatches: Swatch[];
  variantCount: number;
  /** Set when the product has exactly one variant (quick add). */
  defaultVariantId: string | null;
  isNew: boolean;
  isBestseller: boolean;
  isGift: boolean;
  onSale: boolean;
  stockTotal: number;
  lowStock: boolean;
  soldOut: boolean;
  ratingAvg: number | null;
  ratingCount: number;
};

export type CategoryCardData = {
  kind: "category" | "collection";
  slug: string;
  name: string;
  image: string | null;
  count: number;
};

export type NavCategory = {
  slug: string;
  name: string;
  image: string | null;
  children: { slug: string; name: string }[];
};

export type NavCollection = { slug: string; name: string };

export type StorefrontNav = {
  categories: NavCategory[];
  collections: NavCollection[];
};

type Row = Record<string, unknown>;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const asArray = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];

/** Maps one row of public.catalog_products (or a home_feed card). */
export function toProductCard(row: Row | Json): ProductCardData {
  const r = (row ?? {}) as Row;
  const priceMin = asNumber(r.price_min);
  return {
    id: asString(r.id),
    slug: asString(r.slug),
    name: asString(r.name),
    priceMin,
    priceMax: asNumber(r.price_max, priceMin),
    compareAtPrice:
      typeof r.compare_at_price === "number" ? r.compare_at_price : null,
    discountPercent: asNumber(r.discount_percent),
    images: asArray(r.card_images).map((image) => ({
      path: asString(image.path),
      thumb: asString(image.thumb, asString(image.path)),
      alt: asString(image.alt),
      width: typeof image.width === "number" ? image.width : null,
      height: typeof image.height === "number" ? image.height : null,
    })),
    swatches: asArray(r.swatches).map((swatch) => ({
      value: asString(swatch.value),
      hex: typeof swatch.hex === "string" ? swatch.hex : null,
    })),
    variantCount: asNumber(r.variant_count, 1),
    defaultVariantId:
      typeof r.default_variant_id === "string" ? r.default_variant_id : null,
    isNew: r.is_new === true,
    isBestseller: r.is_bestseller === true,
    isGift: r.is_gift === true,
    onSale: r.on_sale === true,
    stockTotal: asNumber(r.stock_total),
    lowStock: r.low_stock === true,
    soldOut: r.sold_out === true,
    ratingAvg: typeof r.rating_avg === "number" ? r.rating_avg : null,
    ratingCount: asNumber(r.rating_count),
  };
}

export function toStorefrontNav(value: Json): StorefrontNav {
  const v = (value ?? {}) as Row;
  return {
    categories: asArray(v.categories).map((c) => ({
      slug: asString(c.slug),
      name: asString(c.name),
      image: typeof c.card_image === "string" ? c.card_image : null,
      children: asArray(c.children).map((child) => ({
        slug: asString(child.slug),
        name: asString(child.name),
      })),
    })),
    collections: asArray(v.collections).map((c) => ({
      slug: asString(c.slug),
      name: asString(c.name),
    })),
  };
}
