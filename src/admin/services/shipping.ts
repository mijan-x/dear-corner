import { db, must } from "../lib/data";
import type { Database } from "../../types/database";

export type ZoneRow = Database["public"]["Tables"]["shipping_zones"]["Row"];

export async function fetchZones() {
  return (
    must(
      await (
        await db()
      )
        .from("shipping_zones")
        .select("*, shipping_zone_areas(district, area)")
        .order("position"),
    ) ?? []
  );
}

export type ZoneWithAreas = Awaited<ReturnType<typeof fetchZones>>[number];

export async function saveZone(
  zone: {
    name: string;
    fee: number;
    min_days: number;
    max_days: number;
    is_active: boolean;
    is_default: boolean;
    position: number;
  },
  areas: { district: string; area: string }[] | null,
  id?: string,
) {
  const client = await db();
  if (zone.is_default) {
    must(
      await client
        .from("shipping_zones")
        .update({ is_default: false })
        .eq("is_default", true),
    );
  }
  const saved = must(
    id
      ? await client
          .from("shipping_zones")
          .update(zone)
          .eq("id", id)
          .select("id")
          .single()
      : await client.from("shipping_zones").insert(zone).select("id").single(),
  );
  const zoneId = saved?.id ?? id;
  if (!zoneId || areas === null) return;
  must(await client.from("shipping_zone_areas").delete().eq("zone_id", zoneId));
  // An area belongs to one zone: take the chosen ones away from any other.
  const byDistrict = new Map<string, string[]>();
  for (const a of areas)
    byDistrict.set(a.district, [...(byDistrict.get(a.district) ?? []), a.area]);
  for (const [district, list] of byDistrict) {
    must(
      await client
        .from("shipping_zone_areas")
        .delete()
        .eq("district", district)
        .in("area", list),
    );
  }
  if (areas.length) {
    must(
      await client
        .from("shipping_zone_areas")
        .insert(areas.map((a) => ({ ...a, zone_id: zoneId }))),
    );
  }
}

export async function deleteZone(id: string) {
  must(await (await db()).from("shipping_zones").delete().eq("id", id));
}

export async function saveFreeThreshold(value: number | null) {
  must(
    await (
      await db()
    )
      .from("store_settings")
      .update({ free_delivery_threshold: value })
      .eq("id", 1),
  );
}
