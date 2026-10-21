import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";
import { toProductCard, type ProductCardData } from "../types/shop";

type Row = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const num = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const numOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);

export type ProductImage = {
  id: string;
  path: string;
  thumb: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Set when the photo belongs to one color. */
  optionValueId: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  isColor: boolean;
  values: { id: string; value: string; hex: string | null }[];
};

export type ProductVariant = {
  id: string;
  sku: string;
  title: string;
  /** One value id per option, in option order. */
  optionValueIds: string[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  imageId: string | null;
};

/** Everything the product page shows (public.get_product). */
export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  detailsAndCare: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isNew: boolean;
  isBestseller: boolean;
  isGift: boolean;
  priceMin: number;
  priceMax: number;
  compareAtPrice: number | null;
  discountPercent: number;
  ratingAvg: number | null;
  ratingCount: number;
  category: {
    slug: string;
    name: string;
    parent: { slug: string; name: string } | null;
  } | null;
  options: ProductOption[];
  variants: ProductVariant[];
  images: ProductImage[];
};

export function toProductDetail(value: unknown): ProductDetail | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Row;
  const category = d.category as Row | null;
  const parent = (category?.parent ?? null) as Row | null;
  return {
    id: str(d.id),
    slug: str(d.slug),
    name: str(d.name),
    shortDescription: str(d.short_description),
    description: str(d.description),
    detailsAndCare: str(d.details_and_care),
    seoTitle: strOrNull(d.seo_title),
    seoDescription: strOrNull(d.seo_description),
    isNew: d.is_new === true,
    isBestseller: d.is_bestseller === true,
    isGift: d.is_gift === true,
    priceMin: num(d.price_min),
    priceMax: num(d.price_max, num(d.price_min)),
    compareAtPrice: numOrNull(d.compare_at_price),
    discountPercent: num(d.discount_percent),
    ratingAvg: numOrNull(d.rating_avg),
    ratingCount: num(d.rating_count),
    category: category
      ? {
          slug: str(category.slug),
          name: str(category.name),
          parent: parent
            ? { slug: str(parent.slug), name: str(parent.name) }
            : null,
        }
      : null,
    options: rows(d.options).map((o) => ({
      id: str(o.id),
      name: str(o.name),
      isColor: o.is_color === true,
      values: rows(o.values).map((v) => ({
        id: str(v.id),
        value: str(v.value),
        hex: strOrNull(v.swatch_hex),
      })),
    })),
    variants: rows(d.variants).map((v) => ({
      id: str(v.id),
      sku: str(v.sku),
      title: str(v.title),
      optionValueIds: Array.isArray(v.option_value_ids)
        ? (v.option_value_ids as unknown[]).map(String)
        : [],
      price: num(v.price),
      compareAtPrice: numOrNull(v.compare_at_price),
      stock: num(v.stock),
      lowStockThreshold: num(v.low_stock_threshold, 3),
      imageId: strOrNull(v.image_id),
    })),
    images: rows(d.images).map((i) => ({
      id: str(i.id),
      path: str(i.path),
      thumb: str(i.thumb) || str(i.path),
      alt: str(i.alt),
      width: numOrNull(i.width),
      height: numOrNull(i.height),
      optionValueId: strOrNull(i.option_value_id),
    })),
  };
}

export async function fetchProduct(
  slug: string,
): Promise<ProductDetail | null> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("get_product", { p_slug: slug });
  if (error) throw error;
  return toProductDetail(data);
}

export function useProduct(slug: string | undefined) {
  return useQuery(slug ? `product:${slug}` : null, () =>
    fetchProduct(slug ?? ""),
  );
}

export async function fetchRelated(
  productId: string,
): Promise<ProductCardData[]> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("related_products", { p_product_id: productId, p_limit: 4 });
  if (error) throw error;
  return rows(data).map(toProductCard);
}

export function useRelated(productId: string | undefined) {
  return useQuery(productId ? `related:${productId}` : null, () =>
    fetchRelated(productId ?? ""),
  );
}

export type ProductReview = {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
};

/** Approved reviews only; asked for only when the product has some. */
export async function fetchReviews(
  productId: string,
): Promise<ProductReview[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("reviews")
    .select("id, reviewer_name, rating, title, body, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.reviewer_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export function useReviews(productId: string | undefined, enabled: boolean) {
  return useQuery(productId && enabled ? `reviews:${productId}` : null, () =>
    fetchReviews(productId ?? ""),
  );
}
