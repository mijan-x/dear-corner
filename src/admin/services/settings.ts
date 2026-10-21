import { db, must } from "../lib/data";
import { toCsv } from "./orders";
import type { Database, Json } from "../../types/database";

export type SettingsRow = Database["public"]["Tables"]["store_settings"]["Row"];
export type SettingsUpdate =
  Database["public"]["Tables"]["store_settings"]["Update"];

export async function fetchSettings() {
  const row = must(
    await (
      await db()
    )
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
  );
  if (!row)
    throw new Error(
      "The shop settings are missing. Run the database migrations again.",
    );
  return row;
}

export async function saveSettings(patch: SettingsUpdate) {
  must(await (await db()).from("store_settings").update(patch).eq("id", 1));
}

export async function saveHomepage(homepage: unknown) {
  await saveSettings({ homepage: homepage as Json });
}

export async function newsletterCsv() {
  const rows = must(
    await (
      await db()
    )
      .from("newsletter_subscribers")
      .select("email, source, created_at")
      .order("created_at"),
  );
  return {
    count: rows?.length ?? 0,
    csv: toCsv((rows ?? []) as Record<string, unknown>[]),
  };
}

export async function fetchActivity(page: number) {
  const { data, error, count } = await (
    await db()
  )
    .from("admin_activity")
    .select("id, action, entity, entity_id, summary, created_at, actor_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
