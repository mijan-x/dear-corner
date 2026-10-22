import { Link } from "react-router";
import { Check } from "lucide-react";
import LeafSprig from "../brand/LeafSprig";
import Sparkle from "../brand/Sparkle";
import { ButtonLink } from "../ui/Button";
import { imageUrl } from "../../lib/images";
import { formatPrice } from "../../utils/formatPrice";
import { withEmphasis } from "../../utils/emphasis";
import type { HomeHero } from "../../services/home";

/**
 * Split hero: text on the left, the photo on the right with
 * the brand corner. Phones stack the text above a 4:5 crop.
 * Performance: one <picture> with a 2400×1000 desktop WebP and a 1080×1350
 * phone crop, fetched with high priority. The photo itself never animates,
 * so it counts for Largest Contentful Paint as soon as it arrives.
 */
function Hero({
  hero,
  freeDeliveryThreshold,
}: {
  hero: HomeHero;
  freeDeliveryThreshold: number | null;
}) {
  const desktop = imageUrl(hero.image_desktop, "site-media");
  const mobile = imageUrl(hero.image_mobile, "site-media") ?? desktop;
  const promises = [
    "Cash on Delivery",
    freeDeliveryThreshold
      ? `Free delivery over ${formatPrice(freeDeliveryThreshold)}`
      : null,
    "Check it at the door",
  ].filter(Boolean) as string[];

  return (
    <section
      aria-labelledby="hero-title"
      className="container-page overflow-x-clip pt-6 pb-14 md:pt-8 lg:pt-12 lg:pb-20"
    >
      <div className="grid items-center gap-8 md:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="max-w-xl lg:py-6">
          {hero.eyebrow && (
            <p
              className="flex animate-fade-up items-center gap-2 type-eyebrow text-terracotta-deep"
              style={{ animationDelay: "40ms" }}
            >
              <Sparkle size={12} className="text-rosewood" />
              {hero.eyebrow}
            </p>
          )}
          <h1
            id="hero-title"
            className="mt-4 animate-fade-up type-hero text-ink xl:text-[64px] xl:leading-[66px]"
            style={{ animationDelay: "100ms" }}
          >
            {withEmphasis(hero.title)}
          </h1>
          {hero.text && (
            <p
              className="mt-5 max-w-md animate-fade-up type-body-lg text-soft-ink"
              style={{ animationDelay: "160ms" }}
            >
              {hero.text}
            </p>
          )}
          <div
            className="mt-7 flex animate-fade-up flex-wrap items-center gap-x-5 gap-y-3"
            style={{ animationDelay: "220ms" }}
          >
            {hero.cta_label && (
              <ButtonLink to={hero.cta_link || "/shop"}>
                {hero.cta_label}
              </ButtonLink>
            )}
            {hero.secondary_label && (
              <Link
                to={hero.secondary_link || "/shop"}
                className="inline-flex min-h-11 items-center type-nav link"
              >
                {hero.secondary_label}
              </Link>
            )}
          </div>
          <ul
            className="mt-8 flex animate-fade-up flex-wrap gap-x-5 gap-y-2 type-caption text-soft-ink"
            style={{ animationDelay: "280ms" }}
          >
            {promises.map((text) => (
              <li key={text} className="flex items-center gap-1.5">
                <Check
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="text-success"
                />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative isolate">
          {/* Lamp-glow halo behind the photo's top right. Decorative. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-14 -right-10 -z-10 size-72 glow md:size-[420px]"
          />
          <div className="relative overflow-hidden corner-mask-lg border border-sand-line/70 bg-image-placeholder">
            {mobile || desktop ? (
              <picture>
                {desktop && (
                  <source
                    media="(min-width: 768px)"
                    srcSet={desktop}
                    width={2400}
                    height={1000}
                  />
                )}
                <img
                  src={(mobile ?? desktop)!}
                  alt={hero.image_alt}
                  width={1080}
                  height={1350}
                  fetchPriority="high"
                  decoding="async"
                  className="block aspect-[4/5] w-full object-cover md:aspect-[16/9] md:object-[85%_50%] lg:aspect-[6/5] lg:object-right"
                />
              </picture>
            ) : (
              <div
                aria-hidden="true"
                className="relative aspect-[4/5] bg-clay-blush md:aspect-[16/9] lg:aspect-[6/5]"
              >
                <LeafSprig className="absolute bottom-[14%] left-1/2 h-[58%] -translate-x-1/2 text-rosewood" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
