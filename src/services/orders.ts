import { getSupabase } from "../lib/supabase";
import type { TimelineStep, ClosedState } from "../components/ui/OrderTimeline";

/**
 * One order as customers see it (private.order_public_json): returned by
 * place_order, track_order (street address hidden) and my_order.
 */
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "handed_to_courier"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type OrderItem = {
  id: string;
  productName: string;
  productSlug: string | null;
  variantId: string | null;
  variantTitle: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  reviewStatus: string | null;
  canReview: boolean;
};

export type OrderView = {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  placedAt: string;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    division: string;
    district: string;
    area: string;
    addressLine: string | null;
    deliveryNote: string | null;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  delivery: {
    zoneName: string | null;
    minDays: number | null;
    maxDays: number | null;
    expectedFrom: string | null;
    expectedTo: string | null;
  };
  courier: {
    name: string | null;
    trackingUrl: string | null;
    trackingCode: string | null;
  } | null;
  timeline: (TimelineStep & { status: OrderStatus })[];
  closed: ClosedState | null;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const numOrNull = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const rows = (v: unknown) => (Array.isArray(v) ? (v as Row[]) : []);

export function toOrderView(value: unknown): OrderView | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Row;
  const c = (o.customer ?? {}) as Row;
  const d = (o.delivery ?? {}) as Row;
  const courier = o.courier as Row | null;
  const closed = o.closed as Row | null;
  return {
    orderNumber: str(o.order_number),
    status: str(o.status) as OrderStatus,
    statusLabel: str(o.status_label),
    placedAt: str(o.placed_at),
    customer: {
      name: str(c.name),
      phone: str(c.phone),
      email: strOrNull(c.email),
      division: str(c.division),
      district: str(c.district),
      area: str(c.area),
      addressLine: strOrNull(c.address_line),
      deliveryNote: strOrNull(c.delivery_note),
    },
    items: rows(o.items).map((i) => ({
      id: str(i.id),
      productName: str(i.product_name),
      productSlug: strOrNull(i.product_slug),
      variantId: strOrNull(i.variant_id),
      variantTitle: str(i.variant_title),
      sku: str(i.sku),
      image: strOrNull(i.image),
      unitPrice: num(i.unit_price),
      compareAtPrice: numOrNull(i.compare_at_price),
      quantity: num(i.quantity),
      lineTotal: num(i.line_total),
      reviewStatus: strOrNull(i.review_status),
      canReview: i.can_review === true,
    })),
    subtotal: num(o.subtotal),
    discount: num(o.discount),
    couponCode: strOrNull(o.coupon_code),
    deliveryFee: num(o.delivery_fee),
    total: num(o.total),
    paymentMethod: str(o.payment_method),
    paymentStatus: str(o.payment_status),
    delivery: {
      zoneName: strOrNull(d.zone_name),
      minDays: numOrNull(d.min_days),
      maxDays: numOrNull(d.max_days),
      expectedFrom: strOrNull(d.expected_from),
      expectedTo: strOrNull(d.expected_to),
    },
    courier: courier
      ? {
          name: strOrNull(courier.name),
          trackingUrl: strOrNull(courier.tracking_url),
          trackingCode: strOrNull(courier.tracking_code),
        }
      : null,
    // A delivered order is finished: every step done, none "Now".
    timeline: rows(o.timeline).map((t) => {
      const finished = str(o.status) === "delivered";
      return {
        status: str(t.status) as OrderStatus,
        label: str(t.label),
        done: t.done === true || (finished && t.current === true),
        current: !finished && t.current === true,
        at: strOrNull(t.at),
      };
    }),
    closed: closed
      ? {
          status: str(closed.status) === "returned" ? "returned" : "cancelled",
          label: str(closed.label),
          at: strOrNull(closed.at),
          note: strOrNull(closed.note),
        }
      : null,
  };
}

export type PlaceOrderInput = {
  items: { variant_id: string; quantity: number }[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    division: string;
    district: string;
    area: string;
    address_line: string;
    delivery_note?: string;
  };
  coupon?: string;
  expectedTotal: number;
};

export async function placeOrder(input: PlaceOrderInput): Promise<OrderView> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("place_order", {
    p_items: input.items,
    p_customer: input.customer,
    p_coupon_code: input.coupon || undefined,
    p_expected_total: input.expectedTotal,
  });
  if (error) throw error;
  const order = toOrderView(data);
  if (!order) throw new Error("The order didn't come back.");
  return order;
}

/** Null when no order matches that number and phone. */
export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<OrderView | null> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("track_order", { p_order_number: orderNumber, p_phone: phone });
  if (error) throw error;
  return toOrderView(data);
}

export async function fetchMyOrder(
  orderNumber: string,
): Promise<OrderView | null> {
  const { data, error } = await (
    await getSupabase()
  ).rpc("my_order", { p_order_number: orderNumber });
  if (error) throw error;
  return toOrderView(data);
}

export type ReviewInput = {
  orderItemId: string;
  rating: number;
  body: string;
  title?: string;
  displayName?: string;
  /** Guests prove the order with its number and phone. */
  orderNumber?: string;
  phone?: string;
};

export async function submitReview(input: ReviewInput): Promise<void> {
  const { error } = await (
    await getSupabase()
  ).rpc("submit_review", {
    p_order_item_id: input.orderItemId,
    p_rating: input.rating,
    p_body: input.body,
    p_title: input.title || undefined,
    p_display_name: input.displayName || undefined,
    p_order_number: input.orderNumber || undefined,
    p_phone: input.phone || undefined,
  });
  if (error) throw error;
}

/** "DC-10482" from "dc 10482", "#DC-10482" or "10482". */
export function normalizeOrderNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `DC-${digits}` : value.trim().toUpperCase();
}

/** 01712345678 from "+880 1712-345678", "8801712345678" or "1712345678". */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

export function isValidPhone(value: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  handed_to_courier: "Handed to courier",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** "Thu 23 Oct" to "Sat 25 Oct", or null when the order has no window. */
export function deliveryWindow(order: OrderView): [string, string] | null {
  const { expectedFrom, expectedTo } = order.delivery;
  return expectedFrom && expectedTo ? [expectedFrom, expectedTo] : null;
}
