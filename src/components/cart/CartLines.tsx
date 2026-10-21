import { useEffect } from "react";
import CartLineItem from "./CartLineItem";
import { Skeleton } from "../ui/Skeleton";
import { cartStore, type CartLine } from "../../features/cart/cartStore";
import type { Quote } from "../../services/cart";

/**
 * The cart's lines in the order they were added, with the database's
 * prices and stock. A line the shop has fewer of than asked is lowered to
 * what's left (and says so).
 */
function CartLines({
  lines,
  quote,
  size = "sm",
  onNavigate,
}: {
  lines: CartLine[];
  quote?: Quote;
  size?: "sm" | "lg";
  onNavigate?: () => void;
}) {
  useEffect(() => {
    if (!quote) return;
    for (const line of quote.lines) {
      if (line.status !== "limited" || line.maxQuantity < 1) continue;
      const local = lines.find((l) => l.variantId === line.variantId);
      if (local && local.quantity > line.maxQuantity) {
        cartStore.setQuantity(line.variantId, line.maxQuantity);
      }
    }
  }, [quote, lines]);

  return (
    <ul className="divide-y divide-sand-line">
      {lines.map((line) => {
        const priced = quote?.lines.find((q) => q.variantId === line.variantId);
        if (!priced) {
          return (
            <li
              key={line.variantId}
              aria-hidden="true"
              className="flex gap-3.5 py-4"
            >
              <Skeleton
                className={
                  size === "lg"
                    ? "size-24 rounded-control"
                    : "size-20 rounded-control"
                }
              />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-4 h-9 w-28" />
              </div>
            </li>
          );
        }
        return (
          <CartLineItem
            key={line.variantId}
            line={priced}
            quantity={line.quantity}
            size={size}
            onNavigate={onNavigate}
          />
        );
      })}
    </ul>
  );
}

export default CartLines;
