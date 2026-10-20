import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Plus } from "lucide-react";
import Badge from "../ui/Badge";
import Price from "../ui/Price";
import Rating from "../ui/Rating";
import LeafSprig from "../brand/LeafSprig";
import { pickBadges } from "../../features/catalog/badges";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";
import type { CardImage, ProductCardData } from "../../types/shop";

const SIZES = "(min-width: 1024px) 282px, (min-width: 768px) 31vw, 46vw";

function srcSetFor(image: CardImage) {
  const thumb = imageUrl(image.thumb);
  const full = imageUrl(image.path);
  if (!thumb || !full || thumb === full) return undefined;
  return `${thumb} 400w, ${full} 1200w`;
}

type ProductCardProps = {
  product: ProductCardData;
  /** First row above the fold: load the photo right away. */
  priority?: boolean;
  /** Quick add for products with a single variant (desktop hover). */
  onQuickAdd?: (product: ProductCardData) => void | Promise<void>;
  /** Heading level of the title inside the surrounding page. */
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * Product card (brand doc section 6). 1:1 photo with a 16px radius on the
 * #F3ECE3 placeholder, up to two badges top-left, then a two-line title, the
 * price row, up to four 16px swatches (+N) and the rating when real reviews
 * exist. The whole card is one link. On devices with a mouse, hovering shows
 * the second photo and a quick add (single-variant products) or "Select
 * options".
 */
function ProductCard({
  product,
  priority = false,
  onQuickAdd,
  headingLevel = 3,
  className,
}: ProductCardProps) {
  const [first, second] = product.images;
  const badges = pickBadges(product);
  const href = routes.product(product.slug);
  const Heading = `h${headingLevel}` as const;
  const extraSwatches = Math.max(0, product.swatches.length - 4);

  return (
    <article className={cx("group relative flex min-w-0 flex-col", className)}>
      <div className="relative aspect-square overflow-hidden rounded-card border border-sand-line/80 bg-image-placeholder">
        {first ? (
          <img
            src={imageUrl(first.thumb) ?? undefined}
            srcSet={srcSetFor(first)}
            sizes={SIZES}
            alt={first.alt || product.name}
            width={first.width ?? 400}
            height={first.height ?? 400}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className={cx(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              product.soldOut && "opacity-70",
            )}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-sand-line"
          >
            <LeafSprig className="h-1/3" strokeWidth={1.5} />
          </div>
        )}
        {second && (
          // Only on devices that hover; lazy + hidden means phones never download it.
          <img
            src={imageUrl(second.thumb) ?? undefined}
            srcSet={srcSetFor(second)}
            sizes={SIZES}
            alt=""
            width={second.width ?? 400}
            height={second.height ?? 400}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 hidden size-full object-cover opacity-0 transition-opacity duration-300 [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100"
          />
        )}
        {badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 md:top-3 md:left-3">
            {badges.map((badge) => (
              <Badge key={badge.kind} kind={badge.kind}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
        {!product.soldOut && (
          <QuickAction product={product} href={href} onQuickAdd={onQuickAdd} />
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <Heading className="type-card-title text-ink">
          {/* Stretched link: the whole card is one tap target. */}
          <Link
            to={href}
            className="line-clamp-2 after:absolute after:inset-0 after:z-[1] after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-rosewood [@media(hover:hover)]:group-hover:underline [@media(hover:hover)]:group-hover:decoration-1 [@media(hover:hover)]:group-hover:underline-offset-4"
          >
            {product.name}
          </Link>
        </Heading>
        <Price
          price={product.priceMin}
          compareAt={product.compareAtPrice}
          from={product.priceMax > product.priceMin}
        />
        {product.swatches.length > 0 && (
          <p className="flex items-center gap-1.5">
            <span className="sr-only">
              Colors: {product.swatches.map((s) => s.value).join(", ")}
            </span>
            {product.swatches.slice(0, 4).map((swatch) => (
              <span
                key={swatch.value}
                aria-hidden="true"
                title={swatch.value}
                className="size-4 rounded-full border border-ink/15"
                style={{ backgroundColor: swatch.hex ?? "#efe7dd" }}
              />
            ))}
            {extraSwatches > 0 && (
              <span aria-hidden="true" className="type-caption text-soft-ink">
                +{extraSwatches}
              </span>
            )}
          </p>
        )}
        {product.ratingCount > 0 && product.ratingAvg !== null && (
          <Rating value={product.ratingAvg} count={product.ratingCount} />
        )}
      </div>
    </article>
  );
}

function QuickAction({
  product,
  href,
  onQuickAdd,
}: {
  product: ProductCardData;
  href: string;
  onQuickAdd?: ProductCardProps["onQuickAdd"];
}) {
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  useEffect(() => {
    if (state !== "added") return;
    const timer = window.setTimeout(() => setState("idle"), 1500);
    return () => window.clearTimeout(timer);
  }, [state]);

  const shared =
    "pointer-events-auto relative z-[2] inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-control type-button shadow-hover transition-colors duration-150";
  // z-[2] on the wrapper: its transform makes it a stacking context, so it
  // must sit above the card's stretched link (z-[1]) as a whole.
  const wrapper =
    "absolute inset-x-3 bottom-3 z-[2] hidden translate-y-2 opacity-0 transition-[opacity,transform] duration-200 ease-out [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100";

  if (product.defaultVariantId && onQuickAdd) {
    return (
      <div className={wrapper}>
        <button
          type="button"
          className={cx(
            shared,
            state === "added"
              ? "bg-success text-white"
              : "bg-paper/95 text-ink backdrop-blur-sm hover:bg-rosewood hover:text-white",
          )}
          aria-label={`Add ${product.name} to cart`}
          disabled={state === "adding"}
          onClick={async () => {
            setState("adding");
            try {
              await onQuickAdd(product);
              setState("added");
            } catch {
              setState("idle");
            }
          }}
        >
          {state === "added" ? (
            <>
              <Check size={18} aria-hidden="true" /> Added
            </>
          ) : (
            <>
              <Plus size={18} aria-hidden="true" /> Add to cart
            </>
          )}
        </button>
      </div>
    );
  }

  if (product.variantCount > 1) {
    return (
      <div className={wrapper} aria-hidden="true">
        {/* Same destination as the card link, so it stays out of the tab order. */}
        <Link
          to={href}
          tabIndex={-1}
          className={cx(
            shared,
            "bg-paper/95 text-ink backdrop-blur-sm hover:bg-rosewood hover:text-white",
          )}
        >
          Select options
        </Link>
      </div>
    );
  }
  return null;
}

export default ProductCard;
