import { ButtonLink } from "../ui/Button";
import Reveal from "../motion/Reveal";
import { imageUrl } from "../../lib/images";
import { cx } from "../../utils/cx";
import { withEmphasis } from "../../utils/emphasis";
import type { HomeBanner } from "../../services/home";

/**
 * Promo banner: a solid panel for the words and the photo beside it, so the
 * text always has full contrast whatever photo is uploaded.
 * dark: Night Plum panel, Warm Linen text, Lamp Glow eyebrow (10.6:1).
 * light: Clay Blush panel, Ink text.
 * Phones: photo on top (5:4), panel below. From 768px: side by side; `flip`
 * puts the photo on the left.
 */
function PromoBanner({
  banner,
  flip = false,
}: {
  banner: HomeBanner;
  flip?: boolean;
}) {
  const desktop = imageUrl(banner.image_desktop, "site-media");
  const mobile = imageUrl(banner.image_mobile, "site-media") ?? desktop;
  const dark = banner.tone === "dark";
  const titleId = `banner-${banner.id}`;

  return (
    <Reveal as="section" aria-labelledby={titleId} className="container-page">
      <div
        className={cx(
          "grid overflow-hidden rounded-card md:min-h-[360px] md:grid-cols-2 lg:min-h-[440px]",
          flip
            ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
            : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
          dark
            ? "surface-dark bg-night-plum text-linen"
            : "bg-clay-blush text-ink",
        )}
      >
        <div
          className={cx(
            "relative min-h-0 overflow-hidden",
            flip ? "md:order-1" : "md:order-2",
          )}
        >
          {(mobile || desktop) && (
            <picture>
              {desktop && (
                <source
                  media="(min-width: 768px)"
                  srcSet={desktop}
                  width={1776}
                  height={740}
                />
              )}
              <img
                src={(mobile ?? desktop)!}
                alt={banner.image_alt}
                width={1000}
                height={800}
                loading="lazy"
                decoding="async"
                className="block aspect-[5/4] w-full object-cover md:absolute md:inset-0 md:aspect-auto md:h-full md:object-[80%_50%]"
              />
            </picture>
          )}
        </div>
        <div
          className={cx(
            "flex flex-col justify-center px-6 py-8 md:px-10 md:py-12 lg:px-14",
            flip ? "md:order-2" : "md:order-1",
          )}
        >
          {banner.eyebrow && (
            <p
              className={cx(
                "type-eyebrow",
                dark ? "text-lamp-glow" : "text-terracotta-deep",
              )}
            >
              {banner.eyebrow}
            </p>
          )}
          <h2 id={titleId} className="mt-3 type-promo">
            {withEmphasis(banner.title)}
          </h2>
          {banner.text && (
            <p
              className={cx(
                "mt-4 max-w-md type-body-lg",
                dark ? "text-linen/80" : "text-ink/80",
              )}
            >
              {banner.text}
            </p>
          )}
          <div className="mt-7">
            <ButtonLink to={banner.link} variant={dark ? "light" : "primary"}>
              {banner.cta_label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default PromoBanner;
