import type { OrderView } from "../../services/orders";

/**
 * The order just placed, kept for this tab only, so the confirmation page
 * can show it (also after a refresh) without another lookup.
 */
const KEY = "dc-last-order";

export function rememberOrder(order: OrderView) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // Private mode: the confirmation page falls back to a lookup.
  }
}

export function recallOrder(orderNumber: string): OrderView | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as OrderView;
    return order.orderNumber === orderNumber ? order : null;
  } catch {
    return null;
  }
}
