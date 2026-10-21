import { cartStore } from "./cartStore";
import { cartDrawer } from "./cartDrawer";

/**
 * Puts an earlier order's items back in the cart and opens it. The cart
 * shows today's prices and anything that has sold out since.
 */
export function reorder(
  items: { variantId: string | null; quantity: number }[],
): number {
  let added = 0;
  for (const item of items) {
    if (!item.variantId) continue;
    cartStore.add(item.variantId, item.quantity);
    added += 1;
  }
  if (added) cartDrawer.open();
  return added;
}
