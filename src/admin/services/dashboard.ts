import { db, must } from "../lib/data";
import type { OrderStatus } from "../../services/orders";

export type Dashboard = {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  lowStockCount: number;
  newMessages: number;
  pendingReviews: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    district: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
    itemCount: number;
  }[];
  lowStock: {
    variantId: string;
    productId: string;
    productName: string;
    variantTitle: string;
    sku: string;
    stock: number;
  }[];
};

type Row = Record<string, unknown>;

export async function fetchDashboard(): Promise<Dashboard> {
  const d = must(await (await db()).rpc("admin_dashboard")) as Row;
  const rows = (v: unknown) => (Array.isArray(v) ? (v as Row[]) : []);
  return {
    todayOrders: Number(d.today_orders ?? 0),
    todayRevenue: Number(d.today_revenue ?? 0),
    pendingOrders: Number(d.pending_orders ?? 0),
    lowStockCount: Number(d.low_stock_count ?? 0),
    newMessages: Number(d.new_messages ?? 0),
    pendingReviews: Number(d.pending_reviews ?? 0),
    recentOrders: rows(d.recent_orders).map((o) => ({
      id: String(o.id),
      orderNumber: String(o.order_number),
      customerName: String(o.customer_name),
      phone: String(o.phone),
      district: String(o.district),
      total: Number(o.total),
      status: o.status as OrderStatus,
      createdAt: String(o.created_at),
      itemCount: Number(o.item_count ?? 0),
    })),
    lowStock: rows(d.low_stock).map((v) => ({
      variantId: String(v.variant_id),
      productId: String(v.product_id),
      productName: String(v.product_name),
      variantTitle: String(v.variant_title),
      sku: String(v.sku),
      stock: Number(v.stock),
    })),
  };
}
