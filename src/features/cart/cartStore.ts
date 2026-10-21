import { createStoredStore } from "../../lib/store";

/**
 * The cart as the shopper sees it, kept in the browser (prices are always
 * worked out again by the database). For a signed-in customer every change
 * is also saved to their account (cart_items, see cartSync.ts), so the cart
 * follows them to another device; the badge still reads this store, so it
 * never waits for a request.
 */
export type CartLine = { variantId: string; quantity: number };

export const MAX_PER_ITEM = 10;

const cart = createStoredStore<CartLine[]>("dc-cart-v1", []);

/** Set by cartSync while someone is signed in: saves one line's quantity. */
let remote: ((variantId: string, quantity: number) => void) | null = null;

function quantityOf(lines: CartLine[], variantId: string) {
  return lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

function write(variantId: string, quantity: number) {
  const q = Math.max(0, Math.min(quantity, MAX_PER_ITEM));
  cart.set((lines) => {
    if (q === 0) return lines.filter((line) => line.variantId !== variantId);
    if (lines.some((line) => line.variantId === variantId)) {
      return lines.map((line) =>
        line.variantId === variantId ? { ...line, quantity: q } : line,
      );
    }
    return [...lines, { variantId, quantity: q }];
  });
  remote?.(variantId, q);
}

export const cartStore = {
  ...cart,
  add(variantId: string, quantity = 1) {
    write(variantId, quantityOf(cart.get(), variantId) + quantity);
  },
  setQuantity(variantId: string, quantity: number) {
    write(variantId, quantity);
  },
  remove(variantId: string) {
    write(variantId, 0);
  },
  /** Empties the cart in this browser only (the account copy is untouched). */
  clear() {
    cart.set([]);
  },
  /** Drops lines locally only: after an order, the database already did. */
  forget(variantIds: string[]) {
    cart.set((lines) =>
      lines.filter((line) => !variantIds.includes(line.variantId)),
    );
  },
  /** Replaces the whole cart (loading the account's saved cart). */
  replace(lines: CartLine[]) {
    cart.set(lines);
  },
  setRemote(writer: typeof remote) {
    remote = writer;
  },
};

/** Number of items in the cart, for the header and bottom-nav badges. */
export function useCartCount(): number {
  return cart.useStore((lines) =>
    lines.reduce((sum, line) => sum + line.quantity, 0),
  );
}

export function useCartLines(): CartLine[] {
  return cart.useStore();
}
