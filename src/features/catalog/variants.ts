import type {
  ProductDetail,
  ProductImage,
  ProductVariant,
} from "../../services/product";

/**
 * Variant logic for the product page. Every option combination is its own
 * variant (SKU) with its own price, stock and photo.
 * A selection maps option id → chosen value id (or null).
 */
export type Selection = Record<string, string | null>;

/** Does the variant fit every chosen value (ignoring `skipOption`)? */
function fits(
  product: ProductDetail,
  variant: ProductVariant,
  selection: Selection,
  skipOption?: string,
) {
  return product.options.every((option, i) => {
    if (option.id === skipOption) return true;
    const chosen = selection[option.id];
    return !chosen || variant.optionValueIds[i] === chosen;
  });
}

/** The variant for a complete selection, or null while something is unchosen. */
export function selectedVariant(
  product: ProductDetail,
  selection: Selection,
): ProductVariant | null {
  if (product.options.length === 0) return product.variants[0] ?? null;
  if (product.options.some((option) => !selection[option.id])) return null;
  return product.variants.find((v) => fits(product, v, selection)) ?? null;
}

/** Variants still possible with what's chosen so far. */
export function candidates(
  product: ProductDetail,
  selection: Selection,
): ProductVariant[] {
  return product.variants.filter((v) => fits(product, v, selection));
}

/**
 * Starting selection: the variant in the address (?variant=) if valid;
 * otherwise options with one value, and the color of the first variant in
 * stock (color drives the photos). Other options wait for the shopper, so
 * a size with a different price is a real choice ("From ৳520").
 */
export function initialSelection(
  product: ProductDetail,
  variantId: string | null,
): Selection {
  const selection: Selection = {};
  const fromUrl = product.variants.find((v) => v.id === variantId);
  const onlyVariant =
    product.variants.length === 1 ? product.variants[0] : undefined;
  const preset = fromUrl ?? onlyVariant;
  const firstInStock =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  product.options.forEach((option, i) => {
    if (preset) selection[option.id] = preset.optionValueIds[i] ?? null;
    else if (option.values.length === 1)
      selection[option.id] = option.values[0].id;
    else if (option.isColor && firstInStock)
      selection[option.id] = firstInStock.optionValueIds[i] ?? null;
    else selection[option.id] = null;
  });
  return selection;
}

/**
 * A value is unavailable when no variant with it (and the other chosen
 * values) is in stock: sold out, or not made in that combination.
 */
export function isUnavailable(
  product: ProductDetail,
  selection: Selection,
  optionIndex: number,
  valueId: string,
): boolean {
  const option = product.options[optionIndex];
  return !product.variants.some(
    (v) =>
      v.optionValueIds[optionIndex] === valueId &&
      v.stock > 0 &&
      fits(product, v, selection, option.id),
  );
}

/** Price to show: the variant's, or the cheapest still possible ("From"). */
export function displayPrice(
  product: ProductDetail,
  selection: Selection,
): { price: number; compareAt: number | null; from: boolean } {
  const variant = selectedVariant(product, selection);
  if (variant) {
    return {
      price: variant.price,
      compareAt: variant.compareAtPrice,
      from: false,
    };
  }
  const list = candidates(product, selection);
  if (list.length === 0) {
    return {
      price: product.priceMin,
      compareAt: product.compareAtPrice,
      from: product.priceMax > product.priceMin,
    };
  }
  const cheapest = list.reduce((a, b) => (b.price < a.price ? b : a));
  const highest = Math.max(...list.map((v) => v.price));
  return {
    price: cheapest.price,
    compareAt: cheapest.compareAtPrice,
    from: highest > cheapest.price,
  };
}

/**
 * Photos for the chosen color: that color's photos plus the shared ones
 * (no color), with the variant's own photo first. Without a color choice
 * (or photos for it), every photo.
 */
export function galleryImages(
  product: ProductDetail,
  selection: Selection,
): ProductImage[] {
  const colorOption = product.options.find((o) => o.isColor);
  const color = colorOption ? selection[colorOption.id] : null;
  let images = product.images;
  if (color) {
    const forColor = product.images.filter(
      (img) => img.optionValueId === color || img.optionValueId === null,
    );
    if (forColor.some((img) => img.optionValueId === color)) images = forColor;
  }
  const variant = selectedVariant(product, selection);
  const lead = variant?.imageId
    ? images.find((img) => img.id === variant.imageId)
    : undefined;
  return lead ? [lead, ...images.filter((img) => img !== lead)] : images;
}

/** Stock wording for a variant (never color alone: text and an icon). */
export function stockStatus(
  variant: ProductVariant | null,
  product: ProductDetail,
): { tone: "ok" | "low" | "out"; text: string } | null {
  if (variant) {
    if (variant.stock <= 0) return { tone: "out", text: "Sold out" };
    if (variant.stock <= variant.lowStockThreshold)
      return { tone: "low", text: `Only ${variant.stock} left` };
    return { tone: "ok", text: "In stock" };
  }
  if (product.variants.every((v) => v.stock <= 0))
    return { tone: "out", text: "Sold out" };
  return null;
}
