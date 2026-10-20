const taka = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Formats a price as ৳1,290: taka sign, no decimals, thousand separators. */
export function formatPrice(amount: number): string {
  return `৳${taka.format(Math.round(amount))}`;
}

/** Discount percent shown on badges (-23%). Under 5% is not shown (returns null). */
export function discountPercent(original: number, sale: number): number | null {
  if (!(original > 0) || !(sale >= 0) || sale >= original) return null;
  const percent = Math.round(((original - sale) / original) * 100);
  return percent >= 5 ? percent : null;
}
