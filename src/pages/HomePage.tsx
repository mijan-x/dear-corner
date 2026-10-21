import Hero from "../components/home/Hero";
import PromoBanner from "../components/home/PromoBanner";
import PromiseStrip from "../components/home/PromiseStrip";
import HomeReviews from "../components/home/HomeReviews";
import InstagramGrid from "../components/home/InstagramGrid";
import Reveal from "../components/motion/Reveal";
import CategoryCard from "../components/product/CategoryCard";
import ProductCard from "../components/product/ProductCard";
import ProductRow, { RowArrows } from "../components/product/ProductRow";
import { useRowScroll } from "../hooks/useRowScroll";
import SectionHeading from "../components/ui/SectionHeading";
import { Skeleton } from "../components/ui/Skeleton";
import { useQuickAdd } from "../features/cart/useAddToCart";
import { usePageMeta } from "../hooks/usePageMeta";
import { routes } from "../lib/routes";
import { useStorefrontNav } from "../services/catalog";
import { toHomepageContent, useHomeFeed } from "../services/home";
import { useShopSettings } from "../services/settings";
import { cx } from "../utils/cx";
import type { CategoryCardData } from "../types/shop";

/**
 * Homepage (brand doc section 6): split hero, six category cards (five
 * categories and New arrivals), the New arrivals row, a promo banner, Best
 * sellers, the gift banner and the shop's promises. Reviews appear once one
 * is approved; the Instagram grid once six photos are set.
 * Home is the only page in the first download (every other page is loaded
 * on demand).
 */
function HomePage() {
  usePageMeta({});
  const { settings } = useShopSettings();
  const content = toHomepageContent(settings.homepage);
  const feed = useHomeFeed();
  const nav = useStorefrontNav();
  const quickAdd = useQuickAdd();
  const row = useRowScroll();
  const data = feed.data;
  const threshold = settings.free_delivery_threshold;

  // Without the database (offline, or not set up yet) the cards still lead
  // into the shop, just without photos and counts.
  const fallbackCards: CategoryCardData[] = [
    ...nav.categories.map((c) => ({
      kind: "category" as const,
      slug: c.slug,
      name: c.name,
      image: c.image,
      count: -1,
    })),
    ...nav.collections.slice(0, 1).map((c) => ({
      kind: "collection" as const,
      slug: c.slug,
      name: c.name,
      image: null,
      count: -1,
    })),
  ];
  const categories = data?.categories.length
    ? data.categories
    : feed.error
      ? fallbackCards
      : [];
  const loadingFirst = !data && !feed.error;
  const [firstBanner, secondBanner] = content.banners;
  const bestsellers = data?.bestsellers ?? [];

  return (
    <>
      <Hero hero={content.hero} freeDeliveryThreshold={threshold} />

      <div className="space-y-16 pb-16 md:space-y-20 lg:space-y-28 lg:pb-24">
        <section aria-labelledby="home-categories" className="container-page">
          <SectionHeading id="home-categories" title="Shop by category" />
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-8 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-6">
            {loadingFirst
              ? Array.from({ length: 6 }, (_, i) => (
                  <li key={i} aria-hidden="true">
                    <Skeleton className="aspect-square w-full rounded-card" />
                    <Skeleton className="mt-3 h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                  </li>
                ))
              : categories.map((category, i) => (
                  <Reveal as="li" key={category.slug} delay={i * 50}>
                    <CategoryCard category={category} />
                  </Reveal>
                ))}
          </ul>
        </section>

        {(loadingFirst || (data && data.newArrivals.length > 0)) && (
          <section aria-labelledby="home-new" className="container-page">
            <SectionHeading
              id="home-new"
              eyebrow="Just in"
              title="New arrivals"
              link={{ to: routes.newArrivals, label: "View all" }}
              actions={
                <RowArrows
                  edges={row.edges}
                  scrollBy={row.scrollBy}
                  label="new arrivals"
                />
              }
            />
            <Reveal className="mt-6 md:mt-8">
              <ProductRow
                listRef={row.ref}
                label="New arrivals"
                products={data?.newArrivals ?? []}
                loading={loadingFirst}
                onQuickAdd={quickAdd}
              />
            </Reveal>
          </section>
        )}

        {firstBanner && <PromoBanner banner={firstBanner} />}

        {bestsellers.length > 0 && (
          <section aria-labelledby="home-best" className="container-page">
            <SectionHeading
              id="home-best"
              title="Best sellers"
              link={{ to: routes.shop, label: "Shop all" }}
            />
            <ul
              className={cx(
                "mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-8 md:grid-cols-3 md:gap-x-6",
                bestsellers.length >= 4 && "lg:grid-cols-4",
              )}
            >
              {bestsellers.map((product, i) => (
                <Reveal as="li" key={product.id} delay={(i % 4) * 60}>
                  <ProductCard product={product} onQuickAdd={quickAdd} />
                </Reveal>
              ))}
            </ul>
          </section>
        )}

        {secondBanner && <PromoBanner banner={secondBanner} flip />}

        {data?.hasReviews && <HomeReviews />}

        <InstagramGrid
          photos={content.instagram}
          handle={settings.instagram_handle}
          profileUrl={settings.instagram_url}
        />
      </div>

      <PromiseStrip freeDeliveryThreshold={threshold} />
    </>
  );
}

export default HomePage;
