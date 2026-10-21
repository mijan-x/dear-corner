import { db, must } from "../lib/data";
import type { Json } from "../../types/database";

export type ProductStatus = "draft" | "active" | "archived";

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};
export type CollectionOption = { id: string; name: string; rule: string };

export async function fetchCategoryOptions(): Promise<CategoryOption[]> {
  const rows = must(
    await (
      await db()
    )
      .from("categories")
      .select("id, name, parent_id, position")
      .order("position")
      .order("name"),
  );
  return (rows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parent_id,
  }));
}

export async function fetchCollectionOptions(): Promise<CollectionOption[]> {
  const rows = must(
    await (
      await db()
    )
      .from("collections")
      .select("id, name, rule, position")
      .order("position"),
  );
  return (rows ?? []).map((c) => ({ id: c.id, name: c.name, rule: c.rule }));
}

/** "Lighting › Table lamps" for sub-categories. */
export function categoryLabel(list: CategoryOption[], id: string | null) {
  const c = list.find((x) => x.id === id);
  if (!c) return "";
  const parent = list.find((x) => x.id === c.parentId);
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

export type ProductListFilters = {
  search: string;
  status: ProductStatus | "";
  category: string;
  page: number;
};
export const PRODUCT_PAGE = 25;

export async function fetchProducts(f: ProductListFilters) {
  let q = (await db())
    .from("products")
    .select(
      "id, name, slug, status, price_min, price_max, variant_count, card_images, is_sample, category_id, updated_at, product_variants(stock, is_active)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(f.page * PRODUCT_PAGE, f.page * PRODUCT_PAGE + PRODUCT_PAGE - 1);
  if (f.status) q = q.eq("status", f.status);
  if (f.category) q = q.eq("category_id", f.category);
  const term = f.search
    .trim()
    .replace(/[,()*]/g, " ")
    .trim();
  if (term) q = q.ilike("name", `*${term}*`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchProduct(id: string) {
  return must(
    await (
      await db()
    )
      .from("products")
      .select(
        "*, product_options(*), product_option_values(*), product_variants(*), product_images(*), product_collections(collection_id)",
      )
      .eq("id", id)
      .maybeSingle(),
  );
}

export type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof fetchProduct>>
>;

export async function saveProduct(payload: Record<string, unknown>) {
  return must(
    await (await db()).rpc("admin_save_product", { p: payload as Json }),
  ) as {
    id: string;
    slug: string;
    deleted_image_paths: { path: string; thumb: string | null }[];
  };
}

export async function deleteSampleData() {
  return must(await (await db()).rpc("admin_delete_sample_data")) as {
    deleted: number;
    archived: number;
    categories: number;
  };
}
