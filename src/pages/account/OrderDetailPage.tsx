import { Link, useParams } from "react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Notice from "../../components/ui/Notice";
import PageLoader from "../../components/system/PageLoader";
import OrderDetails from "../../components/order/OrderDetails";
import { reorder } from "../../features/cart/reorder";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useQuery } from "../../lib/query";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { fetchMyOrder } from "../../services/orders";

/** One of the customer's orders, with the full address and reviews. */
function OrderDetailPage() {
  const { orderNumber = "" } = useParams();
  usePageMeta({ title: `Order ${orderNumber}`, noindex: true });
  const { data, error, refetch } = useQuery(
    `my-order:${orderNumber}`,
    () => fetchMyOrder(orderNumber),
    { staleMs: 30_000 },
  );

  const back = (
    <Link
      to={routes.account}
      className="inline-flex min-h-11 items-center gap-1.5 type-nav link"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      All orders
    </Link>
  );

  if (error && data === undefined) {
    return (
      <div className="space-y-4">
        {back}
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
  if (data === undefined) return <PageLoader className="min-h-[30vh]" />;
  if (data === null) {
    return (
      <div>
        {back}
        <EmptyState headingLevel={1} title="We couldn't find that order.">
          It may have been placed without signing in. You can still track it
          with the phone number you used.
        </EmptyState>
        <div className="flex justify-center">
          <ButtonLink to={routes.trackOrder}>Track an order</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => reorder(data.items)}
        >
          <RotateCcw size={17} aria-hidden="true" />
          Reorder
        </Button>
      </div>
      <OrderDetails order={data} onReviewed={refetch} />
    </div>
  );
}

export default OrderDetailPage;
