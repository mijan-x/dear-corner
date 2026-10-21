import { createStoredStore } from "../../lib/store";

/**
 * The guest cart, kept in the browser and sent with the order (prices are
 * always worked out again by the database). Signed-in carts move to the
 * database in Phase E; this store stays the source for guests.
 */
export type CartLine = { variantId: string; quantity: number };

export const MAX_PER_ITEM = 10;

const cart = createStoredStore<CartLine[]>("dc-cart-v1", []);

export const cartStore = {
  ...cart,
  add(variantId: string, quantity = 1) {
    cart.set((lines) => {
      const existing = lines.find((line) => line.variantId === variantId);
      if (existing) {
        return lines.map((line) =>
          line.variantId === variantId
            ? {
                ...line,
                quantity: Math.min(line.quantity + quantity, MAX_PER_ITEM),
              }
            : line,
        );
      }
      return [
        ...lines,
        { variantId, quantity: Math.min(quantity, MAX_PER_ITEM) },
      ];
    });
  },
  setQuantity(variantId: string, quantity: number) {
    cart.set((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.variantId !== variantId)
        : lines.map((line) =>
            line.variantId === variantId
              ? { ...line, quantity: Math.min(quantity, MAX_PER_ITEM) }
              : line,
          ),
    );
  },
  remove(variantId: string) {
    cart.set((lines) => lines.filter((line) => line.variantId !== variantId));
  },
  clear() {
    cart.set([]);
  },
};

/** Number of items in the cart, for the header and bottom-nav badges. */
export function useCartCount(): number {
  return cart.useStore((lines) =>
    lines.reduce((sum, line) => sum + line.quantity, 0),
  );
}
