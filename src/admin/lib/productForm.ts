import type { ProductRecord, ProductStatus } from "../services/catalog";

/** The product editor's working copy, and how it maps to admin_save_product. */
export type FormValue = {
  key: string;
  id?: string;
  value: string;
  swatchHex: string;
};
export type FormOption = {
  key: string;
  id?: string;
  name: string;
  isColor: boolean;
  values: FormValue[];
};
export type FormVariant = {
  key: string;
  id?: string;
  optionKeys: string[];
  sku: string;
  price: string;
  compareAt: string;
  stock: string;
  lowStock: string;
  imageId: string;
  isActive: boolean;
};
export type FormImage = {
  id: string;
  path: string;
  thumb: string | null;
  alt: string;
  valueKey: string;
};
export type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  detailsAndCare: string;
  isBestseller: boolean;
  isGift: boolean;
  isFeatured: boolean;
  featuredRank: string;
  newUntil: string;
  seoTitle: string;
  seoDescription: string;
  isSample: boolean;
  collectionIds: string[];
  options: FormOption[];
  variants: FormVariant[];
  images: FormImage[];
};

let counter = 0;
export const newKey = (prefix = "k") =>
  `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function blankVariant(): FormVariant {
  return {
    key: newKey("v"),
    optionKeys: [],
    sku: "",
    price: "",
    compareAt: "",
    stock: "0",
    lowStock: "3",
    imageId: "",
    isActive: true,
  };
}

export function emptyForm(): ProductForm {
  return {
    name: "",
    slug: "",
    categoryId: "",
    status: "draft",
    shortDescription: "",
    description: "",
    detailsAndCare: "",
    isBestseller: false,
    isGift: false,
    isFeatured: false,
    featuredRank: "",
    newUntil: "",
    seoTitle: "",
    seoDescription: "",
    isSample: false,
    collectionIds: [],
    options: [],
    variants: [blankVariant()],
    images: [],
  };
}

const str = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

export function toForm(p: ProductRecord): ProductForm {
  const values = [...p.product_option_values].sort(
    (a, b) => a.position - b.position,
  );
  const options = [...p.product_options]
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      key: o.id,
      id: o.id,
      name: o.name,
      isColor: o.is_color,
      values: values
        .filter((v) => v.option_id === o.id)
        .map((v) => ({
          key: v.id,
          id: v.id,
          value: v.value,
          swatchHex: v.swatch_hex ?? "",
        })),
    }));
  const variants = [...p.product_variants]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      key: v.id,
      id: v.id,
      optionKeys: [v.option1, v.option2, v.option3]
        .slice(0, options.length)
        .map((x) => x ?? ""),
      sku: v.sku,
      price: str(v.price),
      compareAt: str(v.compare_at_price),
      stock: str(v.stock),
      lowStock: str(v.low_stock_threshold),
      imageId: v.image_id ?? "",
      isActive: v.is_active,
    }));
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.category_id,
    status: p.status as ProductStatus,
    shortDescription: p.short_description,
    description: p.description,
    detailsAndCare: p.details_and_care,
    isBestseller: p.is_bestseller,
    isGift: p.is_gift,
    isFeatured: p.is_featured,
    featuredRank: str(p.featured_rank),
    newUntil: p.new_until ? p.new_until.slice(0, 10) : "",
    seoTitle: p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
    isSample: p.is_sample,
    collectionIds: p.product_collections.map((c) => c.collection_id),
    options,
    variants: variants.length ? variants : [blankVariant()],
    images: [...p.product_images]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        path: i.path,
        thumb: i.thumb_path,
        alt: i.alt_text,
        valueKey: i.option_value_id ?? "",
      })),
  };
}

const num = (v: string) =>
  v.trim() === "" ? null : Number(v.replace(/[,৳\s]/g, ""));

export function toPayload(f: ProductForm) {
  return {
    id: f.id ?? null,
    name: f.name.trim(),
    slug: f.slug.trim(),
    category_id: f.categoryId,
    status: f.status,
    short_description: f.shortDescription,
    description: f.description,
    details_and_care: f.detailsAndCare,
    is_bestseller: f.isBestseller,
    is_gift: f.isGift,
    is_featured: f.isFeatured,
    featured_rank: f.isFeatured ? f.featuredRank : "",
    new_until: f.newUntil ? `${f.newUntil}T23:59:59+06:00` : "",
    seo_title: f.seoTitle,
    seo_description: f.seoDescription,
    is_sample: f.isSample,
    collection_ids: f.collectionIds,
    options: f.options.map((o) => ({
      id: o.id ?? null,
      name: o.name,
      is_color: o.isColor,
      values: o.values.map((v, i) => ({
        key: v.key,
        id: v.id ?? null,
        value: v.value,
        swatch_hex: o.isColor ? v.swatchHex : "",
        position: i,
      })),
    })),
    variants: f.variants.map((v, i) => ({
      id: v.id ?? null,
      sku: v.sku.trim().toUpperCase(),
      option_keys: v.optionKeys,
      price: num(v.price),
      compare_at_price: num(v.compareAt),
      stock: num(v.stock) ?? 0,
      low_stock_threshold: num(v.lowStock) ?? 3,
      image_id: v.imageId || null,
      position: i,
      is_active: v.isActive,
    })),
    images: f.images.map((img) => ({
      id: img.id,
      alt_text: img.alt,
      option_value_key: img.valueKey || null,
    })),
  };
}

/** Every combination of the option values, keeping rows that already exist. */
export function generateVariants(f: ProductForm): FormVariant[] {
  const lists = f.options.map((o) => o.values);
  if (!lists.length)
    return [{ ...(f.variants[0] ?? blankVariant()), optionKeys: [] }];
  if (lists.some((l) => !l.length)) return f.variants;
  let combos: FormValue[][] = [[]];
  for (const list of lists)
    combos = combos.flatMap((c) => list.map((v) => [...c, v]));
  const byCombo = new Map(f.variants.map((v) => [v.optionKeys.join("|"), v]));
  const template = f.variants[0] ?? blankVariant();
  const base =
    (f.slug || f.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "SKU";
  return combos.map((combo) => {
    const keys = combo.map((v) => v.key);
    const existing = byCombo.get(keys.join("|"));
    if (existing) return existing;
    const suffix = combo
      .map((v) => v.value.toUpperCase().replace(/[^A-Z0-9]+/g, ""))
      .join("-");
    return {
      ...blankVariant(),
      optionKeys: keys,
      sku: `${base}-${suffix}`.slice(0, 40),
      price: template.price,
      compareAt: template.compareAt,
      lowStock: template.lowStock,
    };
  });
}

export function variantTitle(f: ProductForm, v: FormVariant) {
  const names = v.optionKeys.map(
    (k, i) => f.options[i]?.values.find((x) => x.key === k)?.value ?? "?",
  );
  return names.length ? names.join(" / ") : "Default";
}
