import { Link } from "react-router";
import { CircleAlert, Trash2 } from "lucide-react";
import QuantityStepper from "../ui/QuantityStepper";
import LeafSprig from "../brand/LeafSprig";
import { cartStore, MAX_PER_ITEM } from "../../features/cart/cartStore";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";
import type { QuoteLine } from "../../services/cart";
import { lineProblem } from "../../features/cart/lineProblem";

/**
 * One line in the cart drawer or on the cart page: photo, name, variant,
 * price, quantity and Remove. The quantity is this browser's (it changes at
 * once); price and stock come from the database quote.
 */
function CartLineItem({
  line,
  quantity,
  size = "sm",
  onNavigate,
}: {
  line: QuoteLine;
  /** Quantity in the cart here (may be a step ahead of the quote). */
  quantity: number;
  size?: "sm" | "lg";
  onNavigate?: () => void;
}) {
  const src = imageUrl(line.image);
  const problem = lineProblem(line);
  const blocked = line.status === "sold_out" || line.status === "unavailable";
  const href = line.productSlug ? routes.product(line.productSlug) : null;
  const title =
    line.variantTitle && line.variantTitle !== "Default"
      ? line.variantTitle
      : null;
  const max = Math.max(1, Math.min(MAX_PER_ITEM, line.maxQuantity || 1));
  const label = title ? `${line.productName}, ${title}` : line.productName;

  return (
    <li
      className={cx("flex gap-3.5 py-4", size === "lg" && "md:gap-5 md:py-6")}
    >
      <div
        className={cx(
          "relative shrink-0 overflow-hidden rounded-control border border-sand-line bg-image-placeholder",
          size === "lg" ? "size-20 md:size-28" : "size-20",
          blocked && "opacity-60",
        )}
      >
        {src ? (
          <img
            src={src}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center text-sand-line">
            <LeafSprig className="h-1/2" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link
                to={href}
                onClick={onNavigate}
                className="line-clamp-2 type-body font-medium text-ink underline-offset-4 hover:text-rosewood hover:underline"
              >
                {line.productName}
              </Link>
            ) : (
              <p className="line-clamp-2 type-body font-medium text-ink">
                {line.productName}
              </p>
            )}
            {title && <p className="type-caption text-soft-ink">{title}</p>}
            {quantity > 1 && !blocked && (
              <p className="type-caption text-soft-ink">
                <span className="figures">{formatPrice(line.unitPrice)}</span>{" "}
                each
              </p>
            )}
          </div>
          {!blocked && (
            <p className="shrink-0 text-right">
              <span
                className={cx(
                  "block figures font-bold",
                  line.compareAtPrice && line.compareAtPrice > line.unitPrice
                    ? "text-terracotta-deep"
                    : "text-ink",
                )}
              >
                {formatPrice(line.unitPrice * quantity)}
              </span>
              {line.compareAtPrice && line.compareAtPrice > line.unitPrice ? (
                <span className="block type-caption figures text-soft-ink line-through">
                  <span className="sr-only">Was </span>
                  {formatPrice(line.compareAtPrice * quantity)}
                </span>
              ) : null}
            </p>
          )}
        </div>
        {problem && (
          <p
            className={cx(
              "mt-1.5 flex items-start gap-1.5 type-caption font-medium",
              blocked ? "text-error" : "text-warning",
            )}
          >
            <CircleAlert
              size={16}
              aria-hidden="true"
              className="mt-px shrink-0"
            />
            {problem}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2.5">
          {blocked ? (
            <span />
          ) : (
            <QuantityStepper
              size="sm"
              value={Math.min(quantity, max)}
              max={max}
              itemLabel={label}
              onChange={(q) => cartStore.setQuantity(line.variantId, q)}
            />
          )}
          <button
            type="button"
            onClick={() => cartStore.remove(line.variantId)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 type-caption font-medium text-soft-ink transition-colors hover:text-rosewood"
            aria-label={`Remove ${label}`}
          >
            <Trash2 size={18} aria-hidden="true" />
            <span aria-hidden="true">Remove</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export default CartLineItem;
