import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";

/** Delivery zones and fees (admin edits them under Shipping). */
export type ShippingZone = {
  name: string;
  fee: number;
  minDays: number;
  maxDays: number;
  isDefault: boolean;
};

/** Same as the database at launch; shown until it answers. */
export const DEFAULT_ZONES: ShippingZone[] = [
  { name: "Inside Dhaka", fee: 80, minDays: 2, maxDays: 3, isDefault: false },
  { name: "Outside Dhaka", fee: 130, minDays: 3, maxDays: 5, isDefault: true },
];

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("shipping_zones")
    .select("name, fee, min_days, max_days, is_default, position")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  const zones = (data ?? []).map((z) => ({
    name: z.name,
    fee: z.fee,
    minDays: z.min_days,
    maxDays: z.max_days,
    isDefault: z.is_default,
  }));
  return zones.length ? zones : DEFAULT_ZONES;
}

export function useShippingZones(): ShippingZone[] {
  const query = useQuery("shipping-zones", fetchShippingZones, {
    persist: true,
    staleMs: 30 * 60_000,
  });
  return query.data ?? DEFAULT_ZONES;
}

/** "2–3 days" or "3 days". */
export function dayRange(zone: Pick<ShippingZone, "minDays" | "maxDays">) {
  return zone.minDays === zone.maxDays
    ? `${zone.minDays} ${zone.minDays === 1 ? "day" : "days"}`
    : `${zone.minDays}–${zone.maxDays} days`;
}
