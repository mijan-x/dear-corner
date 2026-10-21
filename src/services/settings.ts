import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";

/** The shop-wide settings the storefront shows (admin edits them in Settings). */
export type ShopSettings = {
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string | null;
  free_delivery_threshold: number | null;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_address: string;
  opening_hours: string;
  reply_time: string;
  facebook_url: string;
  instagram_url: string;
  instagram_handle: string;
  tiktok_url: string;
  /** Homepage text, photos and banners (shape in services/home.ts). */
  homepage: unknown;
};

/** Same values as the database defaults, so the first paint matches. */
export const DEFAULT_SETTINGS: ShopSettings = {
  announcement_enabled: true,
  announcement_text:
    "Cash on Delivery across Bangladesh. Free delivery on orders over ৳1,000.",
  announcement_link: null,
  free_delivery_threshold: 1000,
  contact_phone: "",
  contact_whatsapp: "",
  contact_email: "",
  contact_address: "",
  opening_hours: "",
  reply_time: "",
  facebook_url: "",
  instagram_url: "",
  instagram_handle: "",
  tiktok_url: "",
  homepage: {},
};

const COLUMNS = Object.keys(DEFAULT_SETTINGS).join(", ");

export async function fetchShopSettings(): Promise<ShopSettings> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("store_settings")
    .select(COLUMNS)
    .eq("id", 1)
    .single();
  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data as unknown as Partial<ShopSettings>) };
}

export function useShopSettings() {
  const query = useQuery("shop-settings", fetchShopSettings, {
    persist: true,
  });
  return { settings: query.data ?? DEFAULT_SETTINGS, loaded: !!query.data };
}
