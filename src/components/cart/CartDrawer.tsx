import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { ShoppingBag } from "lucide-react";
import Dialog from "../ui/Dialog";
import { ButtonLink, Button } from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Notice from "../ui/Notice";
import FreeDeliveryProgress from "../ui/FreeDeliveryProgress";
import { emptyCopy } from "../ui/emptyStateCopy";
import CartLines from "./CartLines";
import { cartDrawer, useCartDrawerOpen } from "../../features/cart/cartDrawer";
import { useCartLines } from "../../features/cart/cartStore";
import { couponStore, useQuote } from "../../services/cart";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Cart drawer (brand doc section 6): a bottom sheet on phones, a 420px
 * panel from 768px. Opens from the header and after Add to cart.
 */
function CartDrawer() {
  const open = useCartDrawerOpen();
  const lines = useCartLines();
  const coupon = couponStore.useStore();
  const { quote, error, refetch } = useQuote(open ? lines : [], {
    coupon: coupon || undefined,
  });
  const { pathname } = useLocation();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const blocked = quote?.lines.some(
    (line) => line.status === "sold_out" || line.status === "unavailable",
  );

  // Going to another page closes it (not the page it was opened on: the
  // drawer's code may load after it was asked to open).
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (openedOn.current !== pathname) {
      openedOn.current = pathname;
      cartDrawer.close();
    }
  }, [pathname]);

  const close = () => cartDrawer.close();

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="cart"
      title={
        <>
          Your cart{" "}
          {count > 0 && (
            <span className="font-sans text-[16px] font-medium text-soft-ink">
              ({count} {count === 1 ? "item" : "items"})
            </span>
          )}
        </>
      }
      bodyClassName="px-5"
      footer={
        lines.length > 0 && quote ? (
          <div className="space-y-3.5">
            <FreeDeliveryProgress
              amount={quote.subtotal - quote.discount}
              threshold={quote.delivery.freeThreshold}
            />
            <div className="flex items-baseline justify-between">
              <span className="type-body text-ink">
                Subtotal
                {quote.discount > 0 && (
                  <span className="text-soft-ink"> after discount</span>
                )}
              </span>
              <span className="figures text-[18px] font-bold text-ink">
                {formatPrice(quote.subtotal - quote.discount)}
              </span>
            </div>
            <p className="type-caption text-soft-ink">
              Delivery is added at checkout. Pay when it arrives.
            </p>
            {blocked ? (
              <Button fullWidth disabled>
                Remove sold-out items to check out
              </Button>
            ) : (
              <ButtonLink to={routes.checkout} fullWidth onClick={close}>
                Checkout
              </ButtonLink>
            )}
            <Link
              to={routes.cart}
              onClick={close}
              className="flex min-h-11 items-center justify-center type-nav link"
            >
              View cart and add a coupon
            </Link>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          title={emptyCopy.cart.title}
          icon={<ShoppingBag size={40} strokeWidth={1.5} aria-hidden="true" />}
          action={
            <ButtonLink to={routes.newArrivals} onClick={close}>
              {emptyCopy.cart.action}
            </ButtonLink>
          }
          className="py-14"
        />
      ) : error && !quote ? (
        <div className="py-5">
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
      ) : (
        <CartLines lines={lines} quote={quote} onNavigate={close} />
      )}
    </Dialog>
  );
}

export default CartDrawer;
