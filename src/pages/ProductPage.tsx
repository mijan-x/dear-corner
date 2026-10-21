import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { CircleAlert, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import ProductGallery from "../components/product/ProductGallery";
import ProductCard from "../components/product/ProductCard";
import DeliveryInfo from "../components/product/DeliveryInfo";
import Reveal from "../components/motion/Reveal";
import Accordion from "../components/ui/Accordion";
import Badge from "../components/ui/Badge";
import Breadcrumbs, { type Crumb } from "../components/ui/Breadcrumbs";
import { Button, ButtonLink } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Notice from "../components/ui/Notice";
import OptionPicker from "../components/ui/OptionPicker";
import Price from "../components/ui/Price";
import QuantityStepper from "../components/ui/QuantityStepper";
import WishlistButton from "../components/product/WishlistButton";
import Rating from "../components/ui/Rating";
import SectionHeading from "../components/ui/SectionHeading";
import { Skeleton } from "../components/ui/Skeleton";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import { MAX_PER_ITEM } from "../features/cart/cartStore";
import { useAddToCart, useQuickAdd } from "../features/cart/useAddToCart";
import { pickBadges } from "../features/catalog/badges";
import {
  displayPrice,
  galleryImages,
  initialSelection,
  isUnavailable,
  selectedVariant,
  stockStatus,
  type Selection,
} from "../features/catalog/variants";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import {
  useProduct,
  useRelated,
  useReviews,
  type ProductDetail,
} from "../services/product";
import { useShopSettings } from "../services/settings";
import { formatDate } from "../utils/formatDate";
import { cx } from "../utils/cx";

function StockLine({ status }: { status: ReturnType<typeof stockStatus> }) {
  if (!status) return null;
  const icon =
    status.tone === "ok" ? (
      <CircleCheck size={18} aria-hidden="true" />
    ) : status.tone === "low" ? (
      <TriangleAlert size={18} aria-hidden="true" />
    ) : (
      <CircleX size={18} aria-hidden="true" />
    );
  return (
    <p
      className={cx(
        "flex items-center gap-1.5 type-label",
        status.tone === "ok" && "text-success",
        status.tone === "low" && "text-warning",
        status.tone === "out" && "text-soft-ink",
      )}
    >
      {icon}
      {status.text}
    </p>
  );
}

function ProductSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="container-page pt-4 pb-16 md:pt-6"
    >
      <span className="sr-only">Loading the product</span>
      <Skeleton className="h-4 w-48" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-14">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-6 h-11 w-60" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Product page (brand doc section 6). Desktop: photos (58%) stay in view
 * while the details (42%) scroll. Choosing a color swaps the photos with a
 * 200ms fade; sold-out options are crossed out and named. Phones get a
 * fixed 72px bar with the price and Add to cart.
 */
function ProductPage() {
  const { slug } = useParams();
  const { data: product, error, refetch } = useProduct(slug);

  if (product === undefined) {
    if (error) {
      return (
        <div className="container-page py-16">
          <Notice
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {toShopError(error).message}
          </Notice>
        </div>
      );
    }
    return <ProductSkeleton />;
  }
  if (product === null) return <ProductNotFound />;
  return <ProductView key={product.id} product={product} />;
}

function ProductNotFound() {
  usePageMeta({ title: "Not found", noindex: true });
  return (
    <div className="container-page">
      <EmptyState
        headingLevel={1}
        title={emptyCopy.notFound.title}
        action={<ButtonLink to={routes.shop}>Back to the shop</ButtonLink>}
        className="py-20"
      >
        {emptyCopy.notFound.body}
      </EmptyState>
    </div>
  );
}

function ProductView({ product }: { product: ProductDetail }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { settings } = useShopSettings();
  const addToCart = useAddToCart();
  const quickAdd = useQuickAdd();
  const related = useRelated(product.id);
  const reviews = useReviews(product.id, product.ratingCount > 0);

  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(product, params.get("variant")),
  );
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const optionsRef = useRef<HTMLDivElement>(null);

  const variant = selectedVariant(product, selection);
  const price = displayPrice(product, selection);
  const images = galleryImages(product, selection);
  const status = stockStatus(variant, product);
  const soldOut = product.variants.every((v) => v.stock <= 0);
  const maxQty = Math.max(
    1,
    Math.min(MAX_PER_ITEM, variant?.stock ?? MAX_PER_ITEM),
  );
  // Never more than is in stock for the chosen variant.
  const qty = Math.min(quantity, maxQty);
  const colorOption = product.options.find((o) => o.isColor);
  const colorKey = colorOption ? (selection[colorOption.id] ?? "all") : "all";
  const badges = pickBadges(
    {
      soldOut: false,
      onSale: false,
      discountPercent: 0,
      isNew: product.isNew,
      lowStock: false,
      stockTotal: 0,
      isBestseller: product.isBestseller,
      isGift: product.isGift,
    },
    2,
  );

  usePageMeta({
    title: product.seoTitle ?? product.name,
    description:
      product.seoDescription ?? (product.shortDescription || undefined),
  });

  // Keep the chosen variant in the address, so the link opens on it.
  const variantId = variant?.id ?? null;
  useEffect(() => {
    const current = params.get("variant");
    if (product.options.length === 0 || current === variantId) return;
    const next = new URLSearchParams(params);
    if (variantId) next.set("variant", variantId);
    else next.delete("variant");
    setParams(next, { replace: true, preventScrollReset: true });
  }, [variantId, params, setParams, product.options.length]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1500);
    return () => window.clearTimeout(timer);
  }, [added]);

  const choose = (optionId: string, valueId: string, isColor: boolean) => {
    setSelection((s) => ({ ...s, [optionId]: valueId }));
    setMissing(null);
    if (isColor && selection[optionId] !== valueId) setSwaps((n) => n + 1);
  };

  /** Returns the variant, or points the shopper at the first missing choice. */
  const requireVariant = () => {
    if (variant) return variant;
    const first = product.options.find((o) => !selection[o.id]);
    if (first) {
      setMissing(first.id);
      const el = optionsRef.current?.querySelector<HTMLElement>(
        `[data-option="${first.id}"]`,
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({
        preventScroll: true,
      });
    }
    return null;
  };

  const add = () => {
    const v = requireVariant();
    if (!v || v.stock <= 0) return false;
    const label =
      v.title && v.title !== "Default"
        ? `${product.name}, ${v.title}`
        : product.name;
    const ok = addToCart(v.id, qty, label, { openCart: true });
    if (ok) setAdded(true);
    return ok;
  };

  const orderNow = () => {
    const v = requireVariant();
    if (!v || v.stock <= 0) return;
    addToCart(v.id, qty, product.name);
    navigate(routes.checkout);
  };

  const unavailableVariant = variant !== null && variant.stock <= 0;
  const cat = product.category;
  const crumbs: Crumb[] = [
    { label: "Home", to: routes.home },
    ...(cat?.parent
      ? [{ label: cat.parent.name, to: routes.category(cat.parent.slug) }]
      : []),
    ...(cat ? [{ label: cat.name, to: routes.category(cat.slug) }] : []),
    { label: product.name },
  ];

  const addLabel = soldOut || unavailableVariant ? "Sold out" : "Add to cart";

  return (
    <>
      <div className="container-page pt-4 pb-16 md:pt-6 lg:pb-24">
        <Breadcrumbs items={crumbs} />

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:sticky lg:top-[84px] lg:self-start">
            <ProductGallery
              key={colorKey}
              images={images}
              name={product.name}
              fade={swaps > 0}
              soldOut={soldOut}
            />
          </div>

          <div className="min-w-0">
            {badges.length > 0 && (
              <div className="mb-3 flex gap-1.5">
                {badges.map((b) => (
                  <Badge key={b.kind} kind={b.kind}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="type-product-title text-ink">{product.name}</h1>
            {product.ratingCount > 0 && product.ratingAvg !== null && (
              <a href="#reviews" className="mt-2 inline-flex rounded-badge">
                <Rating value={product.ratingAvg} count={product.ratingCount} />
              </a>
            )}

            <div className="mt-4">
              <Price
                size="page"
                price={price.price}
                compareAt={price.compareAt}
                from={price.from}
              />
            </div>
            <div className="mt-3">
              <StockLine status={status} />
            </div>

            {product.shortDescription && (
              <p className="mt-5 type-body-lg text-soft-ink">
                {product.shortDescription}
              </p>
            )}

            {product.options.length > 0 && (
              <div ref={optionsRef} className="mt-7 space-y-6">
                {product.options.map((option, index) => (
                  <div key={option.id} data-option={option.id}>
                    <OptionPicker
                      label={option.name}
                      kind={option.isColor ? "swatch" : "button"}
                      value={selection[option.id] ?? null}
                      onChange={(id) => choose(option.id, id, option.isColor)}
                      choices={option.values.map((value) => ({
                        id: value.id,
                        value: value.value,
                        hex: value.hex,
                        unavailable: isUnavailable(
                          product,
                          selection,
                          index,
                          value.id,
                        ),
                      }))}
                    />
                    {missing === option.id && (
                      <p
                        role="alert"
                        className="mt-2 flex items-center gap-1.5 type-helper text-error!"
                      >
                        <CircleAlert size={16} aria-hidden="true" />
                        Choose a {option.name.toLowerCase()} first.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {!soldOut && (
                <QuantityStepper
                  value={qty}
                  onChange={setQuantity}
                  max={maxQty}
                  itemLabel={product.name}
                  disabled={unavailableVariant}
                />
              )}
              <Button
                onClick={add}
                disabled={soldOut || unavailableVariant}
                successLabel={added ? "Added" : undefined}
                className="min-w-0 flex-1 basis-48"
              >
                {addLabel}
              </Button>
              <WishlistButton
                productId={product.id}
                productName={product.name}
              />
            </div>
            {soldOut && cat && (
              <p className="mt-3 type-body text-soft-ink">
                Sold out for now.{" "}
                <Link to={routes.category(cat.slug)} className="link">
                  See more in {cat.name}
                </Link>
              </p>
            )}
            {!soldOut && (
              <Button
                variant="secondary"
                fullWidth
                onClick={orderNow}
                disabled={unavailableVariant}
                className="mt-3"
              >
                Order now, pay on delivery
              </Button>
            )}

            <div className="mt-8">
              <DeliveryInfo
                freeDeliveryThreshold={settings.free_delivery_threshold}
              />
            </div>

            <div className="mt-6 border-t border-sand-line">
              {product.description && (
                <Accordion title="Description" defaultOpen>
                  <p className="type-body whitespace-pre-line text-ink/85">
                    {product.description}
                  </p>
                </Accordion>
              )}
              {product.detailsAndCare && (
                <Accordion title="Details and care">
                  <p className="type-body whitespace-pre-line text-ink/85">
                    {product.detailsAndCare}
                  </p>
                </Accordion>
              )}
              {variant && variant.sku && (
                <p className="pt-4 type-caption text-soft-ink">
                  SKU: <span className="figures">{variant.sku}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {product.ratingCount > 0 && reviews.data && reviews.data.length > 0 && (
          <section
            id="reviews"
            aria-labelledby="reviews-title"
            className="mt-16 scroll-mt-24 lg:mt-24"
          >
            <SectionHeading id="reviews-title" title="Reviews" />
            {product.ratingAvg !== null && (
              <Rating
                value={product.ratingAvg}
                count={product.ratingCount}
                size={18}
                className="mt-2"
              />
            )}
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {reviews.data.map((review) => (
                <li
                  key={review.id}
                  className="rounded-card border border-sand-line bg-paper p-5"
                >
                  <Rating value={review.rating} />
                  {review.title && (
                    <p className="mt-2 font-semibold text-ink">
                      {review.title}
                    </p>
                  )}
                  <p className="mt-1.5 type-body whitespace-pre-line text-ink/85">
                    {review.body}
                  </p>
                  <p className="mt-3 type-caption text-soft-ink">
                    {review.name} · {formatDate(review.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.data && related.data.length > 0 && (
          <Reveal
            as="section"
            aria-labelledby="related-title"
            className="mt-16 lg:mt-24"
          >
            <SectionHeading id="related-title" title="You may also like" />
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-8 md:gap-x-6 lg:grid-cols-4">
              {related.data.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} onQuickAdd={quickAdd} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>

      {/* Phones: price and Add to cart always in reach (72px bar). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="container-page flex h-[72px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <Price
              size="card"
              price={price.price}
              compareAt={price.compareAt}
              from={price.from}
            />
            {variant && variant.title !== "Default" && (
              <p className="truncate type-caption text-soft-ink">
                {variant.title}
              </p>
            )}
          </div>
          <Button
            onClick={add}
            disabled={soldOut || unavailableVariant}
            successLabel={added ? "Added" : undefined}
            className="shrink-0"
          >
            {addLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

export default ProductPage;
