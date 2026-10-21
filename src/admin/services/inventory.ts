import { db, must } from "../lib/data";

export async function fetchStock() {
  return (
    must(
      await (
        await db()
      )
        .from("product_variants")
        .select(
          "id, sku, title, stock, low_stock_threshold, is_active, product_id, products(name, status)",
        )
        .order("stock")
        .limit(2000),
    ) ?? []
  );
}

export type StockRow = Awaited<ReturnType<typeof fetchStock>>[number];

export async function fetchMovements() {
  return (
    must(
      await (
        await db()
      )
        .from("inventory_movements")
        .select(
          "id, sku, delta, stock_after, reason, note, created_at, products(name)",
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ) ?? []
  );
}

export async function setStock(variantId: string, stock: number, note: string) {
  must(
    await (
      await db()
    ).rpc("admin_set_stock", {
      p_variant_id: variantId,
      p_stock: stock,
      p_note: note || undefined,
    }),
  );
}

export const REASON: Record<string, string> = {
  initial: "First stock",
  manual: "Product edit",
  order: "Order",
  cancelled: "Order cancelled",
  returned: "Order returned",
  correction: "Stock count",
};
