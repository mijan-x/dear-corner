import { db, must } from "../lib/data";
import type { OrderStatus } from "../../services/orders";

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "handed_to_courier",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

/** Allowed next steps (same as public.order_next_statuses). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["handed_to_courier", "cancelled"],
  handed_to_courier: ["out_for_delivery", "delivered", "returned"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export type OrderFilters = {
  status: OrderStatus | "";
  search: string;
  from: string;
  to: string;
  page: number;
};

export const PAGE_SIZE = 25;

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  district: string;
  area: string;
  total: number;
  created_at: string;
  courier_name: string | null;
};

const dhakaStart = (day: string) => `${day}T00:00:00+06:00`;
const dhakaEnd = (day: string) => `${day}T23:59:59.999+06:00`;

export async function fetchOrders(f: OrderFilters) {
  let q = (await db())
    .from("orders")
    .select(
      "id, order_number, status, customer_name, phone, district, area, total, created_at, courier_name",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(f.page * PAGE_SIZE, f.page * PAGE_SIZE + PAGE_SIZE - 1);
  if (f.status) q = q.eq("status", f.status);
  if (f.from) q = q.gte("created_at", dhakaStart(f.from));
  if (f.to) q = q.lte("created_at", dhakaEnd(f.to));
  const term = f.search
    .trim()
    .replace(/[,()*]/g, " ")
    .trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    const parts = [
      `customer_name.ilike.*${term}*`,
      `order_number.ilike.*${term}*`,
    ];
    if (digits.length >= 3) parts.push(`phone.ilike.*${digits}*`);
    q = q.or(parts.join(","));
  }
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as AdminOrderRow[], total: count ?? 0 };
}

export async function fetchOrder(id: string) {
  const data = must(
    await (
      await db()
    )
      .from("orders")
      .select(
        "*, order_items(*), order_status_history(id, status, note, created_at), order_notes(id, body, created_at, author_id)",
      )
      .eq("id", id)
      .maybeSingle(),
  );
  return data;
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof fetchOrder>>>;

export async function updateStatus(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  courierName?: string;
  trackingUrl?: string;
  trackingCode?: string;
}) {
  must(
    await (
      await db()
    ).rpc("admin_update_order_status", {
      p_order_id: input.orderId,
      p_status: input.status,
      p_note: input.note || undefined,
      p_courier_name: input.courierName || undefined,
      p_tracking_url: input.trackingUrl || undefined,
      p_tracking_code: input.trackingCode || undefined,
    }),
  );
}

export async function updateCourier(
  orderId: string,
  name: string,
  url: string,
  code: string,
) {
  must(
    await (
      await db()
    ).rpc("admin_update_order_courier", {
      p_order_id: orderId,
      p_courier_name: name,
      p_tracking_url: url,
      p_tracking_code: code || undefined,
    }),
  );
}

export async function updateDetails(
  orderId: string,
  details: Record<string, string>,
) {
  must(
    await (
      await db()
    ).rpc("admin_update_order_details", {
      p_order_id: orderId,
      p_details: details,
    }),
  );
}

export async function addNote(orderId: string, body: string, authorId: string) {
  must(
    await (
      await db()
    )
      .from("order_notes")
      .insert({ order_id: orderId, body: body.trim(), author_id: authorId }),
  );
}

export async function deleteNote(id: string) {
  must(await (await db()).from("order_notes").delete().eq("id", id));
}

/** CSV of the orders matching the dates and status, for a spreadsheet. */
export async function exportOrdersCsv(
  f: Pick<OrderFilters, "status" | "from" | "to">,
) {
  const rows = must(
    await (
      await db()
    ).rpc("admin_export_orders", {
      p_from: f.from || undefined,
      p_to: f.to || undefined,
      p_statuses: f.status ? [f.status] : undefined,
    }),
  ) as Record<string, unknown>[];
  return toCsv(rows);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  // Byte-order mark so Excel reads ৳ and Bangla correctly.
  return (
    "﻿" +
    [
      cols.join(","),
      ...rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
    ].join("\r\n")
  );
}

export function downloadFile(
  name: string,
  text: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
