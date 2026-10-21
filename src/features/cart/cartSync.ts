import { getSupabase } from "../../lib/supabase";
import { readStored, removeStored, writeStored } from "../../lib/storage";
import { authStore } from "../auth/session";
import { cartStore, type CartLine } from "./cartStore";

/**
 * Keeps a signed-in customer's cart in their account:
 * - on sign-in, a guest cart in this browser is added to the saved cart,
 *   then the saved cart becomes the cart here (a page reload with the same
 *   account only reloads it, so nothing is counted twice);
 * - every change here is saved (one small request per change);
 * - on sign-out, the cart is cleared from this browser.
 */
let started = false;
/** Whose cart this browser holds: an account id, or absent for a guest cart. */
const OWNER_KEY = "dc-cart-owner";

async function load(): Promise<CartLine[]> {
  const client = await getSupabase();
  const { data, error } = await client
    .from("cart_items")
    .select("variant_id, quantity, created_at")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    variantId: row.variant_id,
    quantity: row.quantity,
  }));
}

async function save(variantId: string, quantity: number) {
  const client = await getSupabase();
  const { error } = await client.rpc("cart_set_quantity", {
    p_variant_id: variantId,
    p_quantity: quantity,
  });
  if (error) throw error;
}

export function startCartSync() {
  if (started) return;
  started = true;
  authStore.onUserChange(async (user, previous) => {
    if (!user) {
      cartStore.setRemote(null);
      // Signed out, or a saved session that has expired: the cart here is
      // that account's copy, so it doesn't stay behind on this device.
      if (previous || readStored<string | null>(OWNER_KEY, null)) {
        cartStore.clear();
        removeStored(OWNER_KEY);
      }
      return;
    }
    cartStore.setRemote(null);
    try {
      const owner = readStored<string | null>(OWNER_KEY, null);
      const local = cartStore.get();
      if (local.length && owner === null) {
        const client = await getSupabase();
        await client.rpc("cart_merge", {
          p_items: local.map((line) => ({
            variant_id: line.variantId,
            quantity: line.quantity,
          })),
        });
      }
      cartStore.replace(await load());
      writeStored(OWNER_KEY, user.id);
    } catch {
      // Offline or not set up: the cart stays as it is in this browser.
    }
    cartStore.setRemote((variantId, quantity) => {
      save(variantId, quantity).catch(() => {
        // The next sign-in merges this browser's cart again.
      });
    });
  });
}
