import type { QuoteLine } from "../../services/cart";

/** What to say about a line the shop can't send as it is. */
export function lineProblem(line: QuoteLine): string | null {
  if (line.status === "sold_out") return "Sold out. Remove it to check out.";
  if (line.status === "unavailable")
    return "No longer in the shop. Remove it to check out.";
  if (line.status === "limited")
    return `Only ${line.maxQuantity} left, so we've changed the quantity.`;
  return null;
}
