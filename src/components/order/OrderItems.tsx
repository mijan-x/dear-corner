import type { ReactNode } from "react";
import { Link } from "react-router";
import LeafSprig from "../brand/LeafSprig";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import { formatPrice } from "../../utils/formatPrice";
import type { OrderItem } from "../../services/orders";

/** The lines of a placed order, at the prices it was placed at. */
function OrderItems({
  items,
  action,
}: {
  items: OrderItem[];
  /** Something to show under a line, for example "Write a review". */
  action?: (item: OrderItem) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-sand-line">
      {items.map((item) => {
        const src = imageUrl(item.image);
        const variant =
          item.variantTitle && item.variantTitle !== "Default"
            ? item.variantTitle
            : null;
        const extra = action?.(item);
        return (
          <li
            key={item.id || item.sku}
            className="flex gap-3.5 py-4 first:pt-0 last:pb-0"
          >
            <div className="size-16 shrink-0 overflow-hidden rounded-control border border-sand-line bg-image-placeholder md:size-20">
              {src ? (
                <img
                  src={src}
                  alt=""
                  width={80}
                  height={80}
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
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 type-body font-semibold text-ink">
                  {item.productSlug ? (
                    <Link
                      to={routes.product(item.productSlug)}
                      className="hover:underline"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    item.productName
                  )}
                </p>
                <p className="shrink-0 figures font-bold text-ink">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
              <p className="type-caption text-soft-ink">
                {variant && <>{variant} · </>}
                <span className="figures">
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </span>
              </p>
              {extra && <div className="mt-1.5">{extra}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default OrderItems;
