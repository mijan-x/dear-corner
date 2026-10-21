import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";
import type { OrderView } from "../../services/orders";

/** Totals of a placed order, as the database saved them. */
function OrderTotals({
  order,
  className,
  showPayment = true,
}: {
  order: OrderView;
  className?: string;
  /** Off where the page already says how to pay. */
  showPayment?: boolean;
}) {
  const cod = order.paymentMethod === "cash_on_delivery";
  const paid = order.paymentStatus === "paid";
  const closed = order.status === "cancelled" || order.status === "returned";
  return (
    <dl className={cx("space-y-2.5 type-body text-ink", className)}>
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="figures">{formatPrice(order.subtotal)}</dd>
      </div>
      {order.discount > 0 && (
        <div className="flex justify-between gap-4 text-success">
          <dt>
            Discount
            {order.couponCode && (
              <span className="text-soft-ink"> ({order.couponCode})</span>
            )}
          </dt>
          <dd className="figures">−{formatPrice(order.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt>
          Delivery
          {order.delivery.zoneName && (
            <span className="text-soft-ink"> ({order.delivery.zoneName})</span>
          )}
        </dt>
        <dd className="figures">
          {order.deliveryFee === 0 ? (
            <span className="font-semibold text-success">Free</span>
          ) : (
            formatPrice(order.deliveryFee)
          )}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-sand-line pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="figures text-[18px] font-bold">
          {formatPrice(order.total)}
        </dd>
      </div>
      {showPayment && cod && !closed && (
        <p className="pt-1 type-caption text-soft-ink">
          {paid
            ? "Paid in cash on delivery."
            : `Cash on Delivery: pay ${formatPrice(order.total)} when it arrives.`}
        </p>
      )}
    </dl>
  );
}

export default OrderTotals;
