import { getSupabase } from "../lib/supabase";
import { fetchQuery, invalidateQuery, useQuery } from "../lib/query";
import { toProductCard, type ProductCardData } from "../types/shop";
import type { OrderStatus } from "./orders";

/**
 * A signed-in customer's own data. Row Level Security limits every query
 * here to the person signed in.
 */
/** Fetches a key again now, so pages showing it update after a change. */
function refresh<T>(key: string, fetcher: () => Promise<T>) {
  invalidateQuery(key);
  return fetchQuery(key, fetcher);
}

/** After an order is placed, the orders list is out of date. */
export function forgetMyOrders(userId: string) {
  invalidateQuery(`my-orders:${userId}`);
}

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  total: number;
  items: {
    productName: string;
    image: string | null;
    quantity: number;
    variantId: string | null;
    variantTitle: string;
  }[];
};

export async function fetchMyOrders(): Promise<OrderListItem[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("orders")
    .select(
      "id, order_number, status, created_at, total, order_items(product_name, image_path, quantity, variant_id, variant_title)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status as OrderStatus,
    placedAt: o.created_at,
    total: o.total,
    items: (o.order_items ?? []).map((i) => ({
      productName: i.product_name,
      image: i.image_path,
      quantity: i.quantity,
      variantId: i.variant_id,
      variantTitle: i.variant_title,
    })),
  }));
}

export function useMyOrders(userId: string | undefined) {
  return useQuery(userId ? `my-orders:${userId}` : null, fetchMyOrders, {
    staleMs: 30_000,
  });
}

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id" | "isDefault"> & {
  isDefault?: boolean;
};

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("addresses")
    .select(
      "id, label, full_name, phone, division, district, area, address_line, is_default, created_at",
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.full_name,
    phone: a.phone,
    division: a.division,
    district: a.district,
    area: a.area,
    addressLine: a.address_line,
    isDefault: a.is_default,
  }));
}

export function useAddresses(userId: string | undefined) {
  return useQuery(userId ? `addresses:${userId}` : null, fetchAddresses, {
    staleMs: 60_000,
  });
}

function addressRow(input: AddressInput) {
  return {
    label: input.label.trim() || "Home",
    full_name: input.fullName.trim(),
    phone: input.phone,
    division: input.division,
    district: input.district,
    area: input.area,
    address_line: input.addressLine.trim(),
    ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
  };
}

export async function saveAddress(
  userId: string,
  input: AddressInput,
  id?: string,
): Promise<void> {
  const client = await getSupabase();
  const { error } = id
    ? await client.from("addresses").update(addressRow(input)).eq("id", id)
    : await client.from("addresses").insert(addressRow(input));
  if (error) throw error;
  await refresh(`addresses:${userId}`, fetchAddresses);
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("addresses")
    .delete()
    .eq("id", id);
  if (error) throw error;
  await refresh(`addresses:${userId}`, fetchAddresses);
}

export type Profile = {
  fullName: string;
  phone: string | null;
  email: string | null;
};

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    fullName: data?.full_name ?? "",
    phone: data?.phone ?? null,
    email: data?.email ?? null,
  };
}

export function useProfile(userId: string | undefined) {
  return useQuery(userId ? `profile:${userId}` : null, () =>
    fetchProfile(userId ?? ""),
  );
}

export async function saveProfile(
  userId: string,
  profile: { fullName: string; phone: string | null },
): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("profiles")
    .update({ full_name: profile.fullName.trim(), phone: profile.phone })
    .eq("id", userId);
  if (error) throw error;
  await refresh(`profile:${userId}`, () => fetchProfile(userId));
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------
const CARD_FIELDS =
  "id, slug, name, price_min, price_max, compare_at_price, discount_percent, card_images, swatches, variant_count, default_variant_id, new_until, is_bestseller, is_gift, on_sale, rating_avg, rating_count, status, product_variants(stock, is_active)";

export async function fetchWishlist(): Promise<ProductCardData[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("wishlists")
    .select(`product_id, created_at, products(${CARD_FIELDS})`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .map((row) => {
      const p = (
        Array.isArray(row.products) ? row.products[0] : row.products
      ) as
        | (Record<string, unknown> & {
            status?: string;
            new_until?: string | null;
            product_variants?: { stock: number; is_active: boolean }[];
          })
        | null;
      if (!p || p.status !== "active") return null;
      const stock = (p.product_variants ?? [])
        .filter((v) => v.is_active)
        .reduce((sum, v) => sum + Math.max(0, v.stock), 0);
      return toProductCard({
        ...p,
        is_new: p.new_until ? Date.parse(p.new_until) > now : false,
        stock_total: stock,
        sold_out: stock <= 0,
        low_stock: false,
      });
    })
    .filter((p): p is ProductCardData => p !== null);
}

export function useWishlist(userId: string | undefined) {
  return useQuery(userId ? `wishlist:${userId}` : null, fetchWishlist, {
    staleMs: 30_000,
  });
}

export async function fetchWishlistIds(): Promise<string[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("wishlists")
    .select("product_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

export function useWishlistIds(userId: string | undefined) {
  return useQuery(userId ? `wishlist-ids:${userId}` : null, fetchWishlistIds, {
    staleMs: 60_000,
  });
}

export async function setWishlisted(
  userId: string,
  productId: string,
  on: boolean,
): Promise<void> {
  const client = await getSupabase();
  const { error } = on
    ? await client.from("wishlists").insert({ product_id: productId })
    : await client.from("wishlists").delete().eq("product_id", productId);
  if (error && !(on && error.code === "23505")) throw error;
  await Promise.all([
    refresh(`wishlist-ids:${userId}`, fetchWishlistIds),
    refresh(`wishlist:${userId}`, fetchWishlist),
  ]);
}
