import { ShoppingBag, ShieldCheck } from "lucide-react";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Button, ButtonLink } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Notice from "../components/ui/Notice";
import { Skeleton } from "../components/ui/Skeleton";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import CartLines from "../components/cart/CartLines";
import CartTotals from "../components/cart/CartTotals";
import CouponField from "../components/cart/CouponField";
import DeliveryEstimate from "../components/cart/DeliveryEstimate";
import { useCartLines } from "../features/cart/cartStore";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import { couponStore, useQuote } from "../services/cart";
import { formatPrice } from "../utils/formatPrice";

/**
 * Cart page (brand doc section 6): lines on the left; coupon, delivery
 * estimate, totals and Checkout on the right. Phones keep the total and
 * Checkout in a bar at the bottom.
 */
function CartPage() {
  usePageMeta({ title: "Your cart", noindex: true });
  const lines = useCartLines();
  const coupon = couponStore.useStore();
  const { quote, updating, error, refetch } = useQuote(lines, {
    coupon: coupon || undefined,
  });
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const blocked = quote?.lines.some(
    (line) => line.status === "sold_out" || line.status === "unavailable",
  );

  if (lines.length === 0) {
    return (
      <div className="container-page pt-4 pb-16 md:pt-6">
        <Breadcrumbs
          items={[{ label: "Home", to: routes.home }, { label: "Cart" }]}
        />
        <EmptyState
          headingLevel={1}
          title={emptyCopy.cart.title}
          icon={<ShoppingBag size={40} strokeWidth={1.5} aria-hidden="true" />}
          action={
            <ButtonLink to={routes.newArrivals}>
              {emptyCopy.cart.action}
            </ButtonLink>
          }
          className="py-16"
        />
      </div>
    );
  }

  const checkout = (short: boolean) =>
    blocked ? (
      <Button fullWidth disabled>
        {short ? "Checkout" : "Remove sold-out items to check out"}
      </Button>
    ) : (
      <ButtonLink to={routes.checkout} fullWidth>
        Checkout
      </ButtonLink>
    );

  return (
    <>
      <div className="container-page pt-4 pb-28 md:pt-6 lg:pb-24">
        <Breadcrumbs
          items={[{ label: "Home", to: routes.home }, { label: "Cart" }]}
        />
        <h1 className="mt-5 type-h1 text-ink">
          Your cart{" "}
          <span className="font-sans text-[18px] font-medium text-soft-ink md:text-[20px]">
            ({count} {count === 1 ? "item" : "items"})
          </span>
        </h1>

        <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <section aria-label="Items in your cart" className="min-w-0">
            {error && !quote ? (
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
            ) : (
              <div className="rounded-card border border-sand-line bg-paper px-5 md:px-6">
                <CartLines lines={lines} quote={quote} size="lg" />
              </div>
            )}
          </section>

          <aside
            aria-labelledby="summary-title"
            className="lg:sticky lg:top-[84px] lg:self-start"
          >
            <div className="space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-6">
              <h2 id="summary-title" className="type-h3 text-ink">
                Summary
              </h2>
              <CouponField quote={quote} checking={updating} />
              {quote ? (
                <>
                  <CartTotals quote={quote} />
                  <DeliveryEstimate quote={quote} />
                </>
              ) : (
                <div aria-hidden="true" className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}
              <div className="hidden lg:block">{checkout(false)}</div>
              <p className="flex items-center gap-2 type-caption text-soft-ink">
                <ShieldCheck
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-success"
                />
                Cash on Delivery. Check your parcel at the door before you pay.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Phones and tablets: total and Checkout always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="container-page flex h-[72px] items-center gap-4">
          <div className="min-w-0 flex-1">
            <p
              className={
                blocked
                  ? "type-caption font-medium text-error"
                  : "type-caption text-soft-ink"
              }
            >
              {blocked
                ? "Remove sold-out items"
                : quote?.delivery.known
                  ? "Total"
                  : "Before delivery"}
            </p>
            <p className="figures text-[18px] font-bold text-ink">
              {quote ? formatPrice(quote.total) : "…"}
            </p>
          </div>
          <div className="w-1/2 max-w-xs">{checkout(true)}</div>
        </div>
      </div>
    </>
  );
}

export default CartPage;
