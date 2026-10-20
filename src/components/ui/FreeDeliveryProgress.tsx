import { Truck } from "lucide-react";
import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";

/**
 * "Add ৳250 more for free delivery" with a progress line. Counted on the
 * subtotal after any coupon, like the database does.
 */
function FreeDeliveryProgress({
  amount,
  threshold,
  className,
}: {
  /** Subtotal after coupon, in taka. */
  amount: number;
  /** Free-delivery threshold; null means the shop has none. */
  threshold: number | null;
  className?: string;
}) {
  if (threshold === null || threshold <= 0) return null;
  const remaining = Math.max(0, threshold - amount);
  const percent = Math.min(100, (amount / threshold) * 100);
  const done = remaining === 0;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <p
        role="status"
        className={cx(
          "flex items-center gap-2 type-caption font-medium",
          done ? "text-success" : "text-ink",
        )}
      >
        <Truck size={18} aria-hidden="true" className="shrink-0" />
        {done ? (
          "You've got free delivery."
        ) : (
          <span>
            Add <span className="font-bold">{formatPrice(remaining)}</span> more
            for free delivery
          </span>
        )}
      </p>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-soft-sand"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            done ? "bg-success" : "bg-rosewood",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default FreeDeliveryProgress;
