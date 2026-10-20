import { SupabaseNotConfiguredError } from "./supabase";

/**
 * Turns any error into something to show a shopper: a plain message (brand
 * doc section 6: say what happened and what to do) and a code for logic.
 * Database functions raise friendly messages with a DC_… code in DETAIL.
 */
export type ShopError = {
  code: string;
  message: string;
  /** Extra JSON some database errors carry (for example a fresh quote). */
  hint?: string;
};

export const CONNECTION_MESSAGE =
  "Connection lost. Check your internet and try again.";
export const GENERIC_MESSAGE =
  "Something went wrong on our side. Please try again.";

type PostgrestLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

export function toShopError(error: unknown): ShopError {
  if (error instanceof SupabaseNotConfiguredError) {
    return { code: "DC_NOT_CONFIGURED", message: error.message };
  }
  if (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return { code: "DC_CONNECTION", message: CONNECTION_MESSAGE };
  }
  const e = (error ?? {}) as PostgrestLike;
  if (typeof e.details === "string" && e.details.startsWith("DC_")) {
    return {
      code: e.details,
      message: e.message || GENERIC_MESSAGE,
      hint: e.hint ?? undefined,
    };
  }
  if (typeof e.message === "string" && /fetch|network/i.test(e.message)) {
    return { code: "DC_CONNECTION", message: CONNECTION_MESSAGE };
  }
  return { code: "DC_UNKNOWN", message: GENERIC_MESSAGE };
}
