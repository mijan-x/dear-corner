import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";
import { dayRange } from "../../services/shipping";
import type { Quote } from "../../services/cart";

function Row({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4", className)}>
      <dt>{label}</dt>
      <dd className="text-right figures">{value}</dd>
    </div>
  );
}

/**
 * Subtotal, discount, delivery and total, all from the database quote.
 * Before an address is chosen, delivery shows the zone fees and the total
 * says it is before delivery.
 */
function CartTotals({
  quote,
  className,
}: {
  quote: Quote;
  className?: string;
}) {
  const d = quote.delivery;
  const known = d.known && d.fee !== null;
  return (
    <dl className={cx("space-y-2.5 type-body text-ink", className)}>
      <Row
        label={
          <>
            Subtotal{" "}
            <span className="text-soft-ink">
              ({quote.itemCount} {quote.itemCount === 1 ? "item" : "items"})
            </span>
          </>
        }
        value={formatPrice(quote.subtotal)}
      />
      {quote.discount > 0 && (
        <Row
          label={
            <>
              Discount{" "}
              {quote.coupon?.code && (
                <span className="text-soft-ink">({quote.coupon.code})</span>
              )}
            </>
          }
          value={`−${formatPrice(quote.discount)}`}
          className="text-success"
        />
      )}
      <Row
        label={
          <>
            Delivery
            {known && d.zoneName && (
              <span className="text-soft-ink">
                {" "}
                ({d.zoneName}
                {d.minDays !== null && d.maxDays !== null
                  ? `, ${dayRange({ minDays: d.minDays, maxDays: d.maxDays })}`
                  : ""}
                )
              </span>
            )}
          </>
        }
        value={
          known ? (
            d.fee === 0 ? (
              <span className="font-semibold text-success">Free</span>
            ) : (
              formatPrice(d.fee ?? 0)
            )
          ) : (
            <span className="font-sans text-soft-ink">At checkout</span>
          )
        }
      />
      <Row
        label={
          <span className="font-semibold">
            {known ? "Total" : "Total before delivery"}
          </span>
        }
        value={
          <span className="text-[18px] font-bold">
            {formatPrice(quote.total)}
          </span>
        }
        className="border-t border-sand-line pt-3"
      />
    </dl>
  );
}

export default CartTotals;
