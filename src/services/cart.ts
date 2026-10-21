import { useState } from "react";
import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";
import { createStoredStore } from "../lib/store";
import type { CartLine } from "../features/cart/cartStore";

/**
 * Cart prices always come from the database (public.quote_cart), worked out
 * from the variant ids and quantities in the cart: names, photos, current
 * prices, stock problems, the coupon, delivery and the total.
 */
export type QuoteLineStatus = "ok" | "limited" | "sold_out" | "unavailable";

export type QuoteLine = {
  variantId: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  requestedQuantity: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  status: QuoteLineStatus;
};

export type CouponStatus =
  | "applied"
  | "invalid"
  | "not_eligible"
  | "min_not_met"
  | "used"
  | "rate_limited"
  | "none";

export type ShippingZoneQuote = {
  name: string;
  fee: number;
  minDays: number;
  maxDays: number;
  isDefault: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  hasIssues: boolean;
  subtotal: number;
  coupon: {
    code: string;
    status: CouponStatus;
    message: string | null;
    discount: number;
  } | null;
  discount: number;
  delivery: {
    known: boolean;
    zoneName: string | null;
    fee: number | null;
    baseFee: number | null;
    minDays: number | null;
    maxDays: number | null;
    freeApplied: boolean;
    freeThreshold: number | null;
    amountToFree: number | null;
  };
  zones: ShippingZoneQuote[];
  total: number;
};

type Row = Record<string, unknown>;
const num = (v: unknown, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const numOrNull = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const rows = (v: unknown) => (Array.isArray(v) ? (v as Row[]) : []);

export function toQuote(value: unknown): Quote {
  const q = (value ?? {}) as Row;
  const c = q.coupon as Row | null | undefined;
  const d = (q.delivery ?? {}) as Row;
  return {
    lines: rows(q.lines).map((l) => ({
      variantId: str(l.variant_id),
      productId: typeof l.product_id === "string" ? l.product_id : null,
      productName: str(l.product_name) || "Item no longer in the shop",
      productSlug: str(l.product_slug),
      variantTitle: str(l.variant_title),
      sku: str(l.sku),
      image: typeof l.image === "string" && l.image ? l.image : null,
      unitPrice: num(l.unit_price),
      compareAtPrice: numOrNull(l.compare_at_price),
      requestedQuantity: num(l.requested_quantity),
      quantity: num(l.quantity),
      maxQuantity: num(l.max_quantity),
      lineTotal: num(l.line_total),
      status: (["ok", "limited", "sold_out", "unavailable"].includes(
        str(l.status),
      )
        ? str(l.status)
        : "unavailable") as QuoteLineStatus,
    })),
    itemCount: num(q.item_count),
    hasIssues: q.has_issues === true,
    subtotal: num(q.subtotal),
    coupon: c
      ? {
          code: str(c.code),
          status: (str(c.status) || "none") as CouponStatus,
          message: typeof c.message === "string" ? c.message : null,
          discount: num(c.discount),
        }
      : null,
    discount: num(q.discount),
    delivery: {
      known: d.known === true,
      zoneName: typeof d.zone_name === "string" ? d.zone_name : null,
      fee: numOrNull(d.fee),
      baseFee: numOrNull(d.base_fee),
      minDays: numOrNull(d.min_days),
      maxDays: numOrNull(d.max_days),
      freeApplied: d.free_applied === true,
      freeThreshold: numOrNull(d.free_threshold),
      amountToFree: numOrNull(d.amount_to_free),
    },
    zones: rows(q.zones).map((z) => ({
      name: str(z.name),
      fee: num(z.fee),
      minDays: num(z.min_days),
      maxDays: num(z.max_days),
      isDefault: z.is_default === true,
    })),
    total: num(q.total),
  };
}

export type QuoteParams = {
  coupon?: string;
  district?: string;
  area?: string;
  phone?: string;
};

export function cartItems(lines: CartLine[]) {
  return lines.map((line) => ({
    variant_id: line.variantId,
    quantity: line.quantity,
  }));
}

export async function fetchQuote(
  lines: CartLine[],
  params: QuoteParams,
): Promise<Quote> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("quote_cart", {
    p_items: cartItems(lines),
    p_coupon_code: params.coupon || undefined,
    p_district: params.district || undefined,
    p_area: params.area || undefined,
    p_phone: params.phone || undefined,
  });
  if (error) throw error;
  return toQuote(data);
}

/**
 * The quote for the current cart. While a new quote loads (quantity
 * changed, coupon applied, area chosen) the previous one stays on screen,
 * marked as updating, so nothing jumps.
 */
export function useQuote(lines: CartLine[], params: QuoteParams = {}) {
  const key = lines.length
    ? `quote:${JSON.stringify({ lines, ...params })}`
    : null;
  const query = useQuery(key, () => fetchQuote(lines, params), {
    staleMs: 30_000,
  });
  const [last, setLast] = useState<Quote | undefined>(undefined);
  if (query.data && query.data !== last) setLast(query.data);
  return {
    quote: key ? (query.data ?? last) : undefined,
    updating: Boolean(key) && !query.data && !query.error,
    error: query.data ? undefined : query.error,
    refetch: query.refetch,
  };
}

/** The coupon code the shopper entered, carried from the cart to checkout. */
export const couponStore = createStoredStore<string>("dc-coupon", "");
