import { Link } from "react-router";
import { ChevronRight, Package, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Notice from "../../components/ui/Notice";
import { Skeleton } from "../../components/ui/Skeleton";
import { emptyCopy } from "../../components/ui/emptyStateCopy";
import { useToast } from "../../components/ui/useToast";
import LeafSprig from "../../components/brand/LeafSprig";
import StatusChip from "../../components/order/StatusChip";
import { useAuth } from "../../features/auth/session";
import { reorder } from "../../features/cart/reorder";
import { usePageMeta } from "../../hooks/usePageMeta";
import { imageUrl } from "../../lib/images";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { useMyOrders, type OrderListItem } from "../../services/account";
import { formatDate } from "../../utils/formatDate";
import { formatPrice } from "../../utils/formatPrice";

function Thumbs({ items }: { items: OrderListItem["items"] }) {
  const shown = items.slice(0, 4);
  const more = items.length - shown.length;
  return (
    <div className="flex -space-x-3">
      {shown.map((item, i) => {
        const src = imageUrl(item.image);
        return (
          <span
            key={`${item.variantId}-${i}`}
            className="size-14 overflow-hidden rounded-control border-2 border-paper bg-image-placeholder shadow-[0_0_0_1px_var(--color-sand-line)]"
          >
            {src ? (
              <img
                src={src}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-sand-line">
                <LeafSprig className="h-1/2" />
              </span>
            )}
          </span>
        );
      })}
      {more > 0 && (
        <span className="grid size-14 place-items-center rounded-control border-2 border-paper bg-cream type-caption font-semibold text-ink shadow-[0_0_0_1px_var(--color-sand-line)]">
          +{more}
        </span>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: OrderListItem }) {
  const toast = useToast();
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const names = order.items.map((item) => item.productName).join(", ");
  return (
    <li className="rounded-card border border-sand-line bg-paper p-5 transition-shadow duration-200 hover:shadow-[0_8px_30px_-12px_rgb(43_33_35/0.18)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="type-h3 text-ink">
            <Link
              to={routes.accountOrder(order.orderNumber)}
              className="hover:underline"
            >
              <span className="figures">#{order.orderNumber}</span>
            </Link>
          </h2>
          <p className="type-caption text-soft-ink">
            {formatDate(order.placedAt)} · {count}{" "}
            {count === 1 ? "item" : "items"} ·{" "}
            <span className="figures font-semibold text-ink">
              {formatPrice(order.total)}
            </span>
          </p>
        </div>
        <StatusChip status={order.status} />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Thumbs items={order.items} />
        <p className="line-clamp-2 min-w-0 flex-1 type-body text-soft-ink">
          {names}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink
          to={routes.accountOrder(order.orderNumber)}
          variant="secondary"
          size="sm"
        >
          View order
          <ChevronRight size={18} aria-hidden="true" />
        </ButtonLink>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            if (!reorder(order.items)) {
              toast.show("These items aren't in the shop any more.", "info");
            }
          }}
          aria-label={`Reorder the items from order ${order.orderNumber}`}
        >
          <RotateCcw size={17} aria-hidden="true" />
          Reorder
        </Button>
      </div>
    </li>
  );
}

/** Account home: every order with its status, newest first. */
function OrdersPage() {
  usePageMeta({ title: "Your orders", noindex: true });
  const auth = useAuth();
  const { data, error, refetch } = useMyOrders(auth.user?.id);

  return (
    <div>
      <h1 className="type-h2 text-ink">Your orders</h1>
      <div className="mt-5">
        {error && !data ? (
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
        ) : !data ? (
          <ul aria-hidden="true" className="space-y-4">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="space-y-3 rounded-card border border-sand-line bg-paper p-6"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-14 w-48" />
              </li>
            ))}
          </ul>
        ) : data.length === 0 ? (
          <EmptyState
            title={emptyCopy.orders.title}
            icon={<Package size={40} strokeWidth={1.5} aria-hidden="true" />}
            action={
              <ButtonLink to={routes.newArrivals}>
                Browse new arrivals
              </ButtonLink>
            }
            className="rounded-card border border-sand-line bg-paper"
          >
            {emptyCopy.orders.body}
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {data.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
