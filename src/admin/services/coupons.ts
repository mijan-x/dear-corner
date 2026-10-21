import { db, must } from "../lib/data";
import type { Database } from "../../types/database";

export type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponInput = Database["public"]["Tables"]["coupons"]["Insert"];

export async function fetchCoupons() {
  return (
    must(
      await (
        await db()
      )
        .from("coupons")
        .select(
          "*, coupon_categories(category_id), coupon_redemptions(released_at, discount)",
        )
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}

export type CouponListRow = Awaited<ReturnType<typeof fetchCoupons>>[number];

export async function saveCoupon(
  input: CouponInput,
  categoryIds: string[],
  id?: string,
) {
  const client = await db();
  const saved = must(
    id
      ? await client
          .from("coupons")
          .update(input)
          .eq("id", id)
          .select("id")
          .single()
      : await client.from("coupons").insert(input).select("id").single(),
  );
  const couponId = saved?.id ?? id;
  if (!couponId) return;
  must(
    await client.from("coupon_categories").delete().eq("coupon_id", couponId),
  );
  if (categoryIds.length) {
    must(
      await client.from("coupon_categories").insert(
        categoryIds.map((category_id) => ({
          coupon_id: couponId,
          category_id,
        })),
      ),
    );
  }
}

export async function deleteCoupon(id: string) {
  must(await (await db()).from("coupons").delete().eq("id", id));
}
