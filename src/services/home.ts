import { getSupabase } from "../lib/supabase";
import { useQuery } from "../lib/query";
import {
  toProductCard,
  type CategoryCardData,
  type ProductCardData,
} from "../types/shop";
import { useShopSettings } from "./settings";

/**
 * Homepage content, stored in store_settings.homepage (admin edits it in
 * Settings). Every field is optional in the database; what's missing comes
 * from the defaults below, so the homepage is complete before the shop
 * changes anything. An empty `banners` list hides the banners; the
 * Instagram grid shows only with at least six photos.
 *
 * {
 *   "hero": { "eyebrow", "title", "text", "cta_label", "cta_link",
 *             "secondary_label", "secondary_link",
 *             "image_desktop", "image_mobile", "image_alt" },
 *   "banners": [{ "id", "eyebrow", "title", "text", "cta_label", "link",
 *                 "tone": "dark" | "light",
 *                 "image_desktop", "image_mobile", "image_alt" }],
 *   "instagram": [{ "image", "alt", "link" }]
 * }
 *
 * Images are site paths (/samples/…) or paths in the site-media bucket.
 * In titles, *word* is shown in italics.
 */
export type HomeHero = {
  eyebrow: string;
  title: string;
  text: string;
  cta_label: string;
  cta_link: string;
  secondary_label: string;
  secondary_link: string;
  /** 2400×1000 WebP; the subject sits in the right half. */
  image_desktop: string | null;
  /** 1080×1350 WebP. */
  image_mobile: string | null;
  image_alt: string;
};

export type HomeBanner = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  cta_label: string;
  link: string;
  /** dark: light text on a night-plum fade; light: ink text on a linen fade. */
  tone: "dark" | "light";
  /** About 2.4:1; text sits over the left side. */
  image_desktop: string | null;
  /** About 5:4. */
  image_mobile: string | null;
  image_alt: string;
};

export type InstagramPhoto = { image: string; alt: string; link: string };

export type HomepageContent = {
  hero: HomeHero;
  banners: HomeBanner[];
  instagram: InstagramPhoto[];
};

/** Demo content until the owner sets their own (photos: replace before launch). */
export const DEFAULT_HOMEPAGE: HomepageContent = {
  hero: {
    eyebrow: "Room decor, lamps and little gifts",
    title: "Little Things, *Lovely* Spaces.",
    text: "Lamps, room decor, desk picks and gifts, chosen for how they look in a real room. Delivered across Bangladesh, and you pay when it arrives.",
    cta_label: "Shop new arrivals",
    cta_link: "/collections/new-arrivals",
    secondary_label: "Browse all",
    secondary_link: "/shop",
    image_desktop: "/samples/home/hero-desktop.webp",
    image_mobile: "/samples/home/hero-mobile.webp",
    image_alt:
      "A calm desk corner with a glowing pleated lamp, a ribbed vase of daisies and a notebook",
  },
  banners: [
    {
      id: "evening-light",
      eyebrow: "Lighting",
      title: "Soft light for slow evenings",
      text: "Pleated lamps and little night lights that make a corner feel calm.",
      cta_label: "Shop lighting",
      link: "/shop/lighting",
      tone: "dark",
      image_desktop: "/samples/home/banner-evening-desktop.webp",
      image_mobile: "/samples/home/banner-evening-mobile.webp",
      image_alt:
        "A blush pleated lamp and a mushroom night lamp glowing on a bedside table",
    },
    {
      id: "gift-sets",
      eyebrow: "Gifts",
      title: "Little gifts, ready to give",
      text: "Small, thoughtful picks under ৳999 for birthdays, thank-yous and just because.",
      cta_label: "Shop gifts under ৳999",
      link: "/collections/gifts-under-999",
      tone: "light",
      image_desktop: "/samples/home/banner-gifts-desktop.webp",
      image_mobile: "/samples/home/banner-gifts-mobile.webp",
      image_alt:
        "An open kraft gift box with a candle, a notebook and a claw clip beside a ribboned box",
    },
  ],
  instagram: [],
};

type Row = Record<string, unknown>;

const str = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;
const strOrNull = (value: unknown, fallback: string | null) =>
  value === null ? null : typeof value === "string" ? value : fallback;

/** Database JSON merged over the defaults; unknown or broken fields are ignored. */
export function toHomepageContent(value: unknown): HomepageContent {
  const v = (value && typeof value === "object" ? value : {}) as Row;
  const h = (v.hero && typeof v.hero === "object" ? v.hero : {}) as Row;
  const d = DEFAULT_HOMEPAGE.hero;
  const hero: HomeHero = {
    eyebrow: str(h.eyebrow, d.eyebrow),
    title: str(h.title, d.title) || d.title,
    text: str(h.text, d.text),
    cta_label: str(h.cta_label, d.cta_label),
    cta_link: str(h.cta_link, d.cta_link),
    secondary_label: str(h.secondary_label, d.secondary_label),
    secondary_link: str(h.secondary_link, d.secondary_link),
    image_desktop: strOrNull(h.image_desktop, d.image_desktop),
    image_mobile: strOrNull(h.image_mobile, d.image_mobile),
    image_alt: str(h.image_alt, d.image_alt),
  };

  const banners = Array.isArray(v.banners)
    ? (v.banners as Row[])
        .map((b, i): HomeBanner => ({
          id: str(b.id, `banner-${i}`),
          eyebrow: str(b.eyebrow, ""),
          title: str(b.title, ""),
          text: str(b.text, ""),
          cta_label: str(b.cta_label, "Shop now"),
          link: str(b.link, "/shop"),
          tone: b.tone === "light" ? "light" : "dark",
          image_desktop: strOrNull(b.image_desktop, null),
          image_mobile: strOrNull(b.image_mobile, null),
          image_alt: str(b.image_alt, ""),
        }))
        // a banner shows only when it has an image.
        .filter((b) => b.title && (b.image_desktop || b.image_mobile))
    : DEFAULT_HOMEPAGE.banners;

  const instagram = Array.isArray(v.instagram)
    ? (v.instagram as Row[])
        .map((p) => ({
          image: str(p.image, ""),
          alt: str(p.alt, ""),
          link: str(p.link, ""),
        }))
        .filter((p) => p.image)
    : [];

  return { hero, banners, instagram };
}

export function useHomepageContent(): HomepageContent {
  const { settings } = useShopSettings();
  return toHomepageContent(settings.homepage);
}

export type HomeFeed = {
  categories: CategoryCardData[];
  newArrivals: ProductCardData[];
  bestsellers: ProductCardData[];
  hasReviews: boolean;
};

export async function fetchHomeFeed(): Promise<HomeFeed> {
  const { data, error } = await (await getSupabase()).rpc("home_feed");
  if (error) throw error;
  const d = (data ?? {}) as Row;
  const list = (value: unknown) =>
    Array.isArray(value) ? (value as Row[]) : [];
  return {
    categories: list(d.categories).map((c) => ({
      kind: c.kind === "collection" ? "collection" : "category",
      slug: str(c.slug, ""),
      name: str(c.name, ""),
      image: typeof c.image === "string" ? c.image : null,
      count: typeof c.count === "number" ? c.count : 0,
    })),
    newArrivals: list(d.new_arrivals).map(toProductCard),
    bestsellers: list(d.bestsellers).map(toProductCard),
    hasReviews: d.has_reviews === true,
  };
}

/** Kept in localStorage too, so a returning visitor sees the homepage at once. */
export function useHomeFeed() {
  return useQuery("home-feed", fetchHomeFeed, { persist: true });
}

export type HomeReview = {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  body: string;
  product: { name: string; slug: string } | null;
};

/** The latest approved reviews (only asked for once one exists). */
export async function fetchHomeReviews(): Promise<HomeReview[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("reviews")
    .select("id, reviewer_name, rating, title, body, products(name, slug)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const product = (Array.isArray(r.products) ? r.products[0] : r.products) as
      { name: string; slug: string } | null | undefined;
    return {
      id: r.id,
      name: r.reviewer_name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      product: product ? { name: product.name, slug: product.slug } : null,
    };
  });
}
