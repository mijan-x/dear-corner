import { useCallback } from "react";
import { useToast } from "../../components/ui/useToast";
import { cartStore, MAX_PER_ITEM } from "./cartStore";
import { cartDrawer } from "./cartDrawer";
import type { ProductCardData } from "../../types/shop";

/**
 * Adds a variant to the cart and confirms it with a toast. The header badge
 * updates from the cart store. Prices are worked out again at checkout.
 */
export function useAddToCart() {
  const toast = useToast();
  return useCallback(
    (
      variantId: string,
      quantity: number,
      name: string,
      { openCart = false }: { openCart?: boolean } = {},
    ) => {
      const before = cartStore
        .get()
        .find((line) => line.variantId === variantId)?.quantity;
      cartStore.add(variantId, quantity);
      const after = cartStore
        .get()
        .find((line) => line.variantId === variantId)?.quantity;
      if (before !== undefined && after === before) {
        toast.show(
          `You already have the most we can send of this (${MAX_PER_ITEM}).`,
          "info",
        );
        return false;
      }
      if (openCart) cartDrawer.open();
      else toast.show(`Added to cart: ${name}`, "success");
      return true;
    },
    [toast],
  );
}

/** Quick add from a product card (single-variant products only). */
export function useQuickAdd() {
  const add = useAddToCart();
  return useCallback(
    (product: ProductCardData) => {
      if (!product.defaultVariantId) return;
      add(product.defaultVariantId, 1, product.name);
    },
    [add],
  );
}
