import { db, must } from "../lib/data";
import type { Database } from "../../types/database";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
export type CategoryInput =
  Database["public"]["Tables"]["categories"]["Insert"];
export type CollectionInput =
  Database["public"]["Tables"]["collections"]["Insert"];

export async function fetchCategories() {
  return (
    must(
      await (
        await db()
      )
        .from("categories")
        .select("*, products(count)")
        .order("position")
        .order("name"),
    ) ?? []
  );
}

export async function saveCategory(input: CategoryInput, id?: string) {
  const client = await db();
  must(
    id
      ? await client.from("categories").update(input).eq("id", id)
      : await client.from("categories").insert(input),
  );
}

export async function deleteCategory(id: string) {
  must(await (await db()).from("categories").delete().eq("id", id));
}

export async function fetchCollections() {
  return (
    must(
      await (
        await db()
      )
        .from("collections")
        .select("*, product_collections(count)")
        .order("position"),
    ) ?? []
  );
}

export async function saveCollection(input: CollectionInput, id?: string) {
  const client = await db();
  must(
    id
      ? await client.from("collections").update(input).eq("id", id)
      : await client.from("collections").insert(input),
  );
}

export async function deleteCollection(id: string) {
  must(await (await db()).from("collections").delete().eq("id", id));
}

/** Postgres refused because something still points here (products, sub-categories). */
export function inUse(error: unknown) {
  return (error as { code?: string })?.code === "23503";
}
