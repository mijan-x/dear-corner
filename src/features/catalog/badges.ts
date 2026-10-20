import type { ProductCardData } from "../../types/shop";

export type BadgeKind =
  | "sold-out"
  | "sale"
  | "new"
  | "low-stock"
  | "bestseller"
  | "gift"
  | "free-delivery";

export type BadgeSpec = { kind: BadgeKind; label: string };

/**
 * Which badges a product card shows (owner decision, 20 Oct 2026):
 * priority Sold out, Sale, New, Low stock, Bestseller, Gift; at most two;
 * never Sale and Bestseller together. No sale badge under 5% off.
 */
export function pickBadges(
  product: Pick<
    ProductCardData,
    | "soldOut"
    | "onSale"
    | "discountPercent"
    | "isNew"
    | "lowStock"
    | "stockTotal"
    | "isBestseller"
    | "isGift"
  >,
  max = 2,
): BadgeSpec[] {
  const candidates: BadgeSpec[] = [];
  if (product.soldOut) candidates.push({ kind: "sold-out", label: "Sold out" });
  if (product.onSale && product.discountPercent >= 5) {
    candidates.push({ kind: "sale", label: `-${product.discountPercent}%` });
  }
  if (product.isNew) candidates.push({ kind: "new", label: "New" });
  if (!product.soldOut && product.lowStock && product.stockTotal > 0) {
    candidates.push({
      kind: "low-stock",
      label: `Only ${product.stockTotal} left`,
    });
  }
  if (product.isBestseller) {
    candidates.push({ kind: "bestseller", label: "Bestseller" });
  }
  if (product.isGift) candidates.push({ kind: "gift", label: "Gift" });

  const picked: BadgeSpec[] = [];
  for (const badge of candidates) {
    if (picked.length >= max) break;
    const kinds = picked.map((b) => b.kind);
    if (badge.kind === "bestseller" && kinds.includes("sale")) continue;
    if (badge.kind === "sale" && kinds.includes("bestseller")) continue;
    picked.push(badge);
  }
  return picked;
}
