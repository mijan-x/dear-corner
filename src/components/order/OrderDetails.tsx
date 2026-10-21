import { useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  PenLine,
  Star,
  Truck,
} from "lucide-react";
import OrderTimeline from "../ui/OrderTimeline";
import { Button } from "../ui/Button";
import OrderItems from "./OrderItems";
import OrderTotals from "./OrderTotals";
import ReviewDialog from "./ReviewDialog";
import StatusChip from "./StatusChip";
import {
  deliveryWindow,
  type OrderItem,
  type OrderView,
} from "../../services/orders";
import { formatDate, formatDateTime } from "../../utils/formatDate";

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-sand-line bg-paper p-5 md:p-6 ${className ?? ""}`}
    >
      <h2 className="mb-4 type-h3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ReviewAction({
  item,
  onWrite,
}: {
  item: OrderItem;
  onWrite: (item: OrderItem) => void;
}) {
  if (item.reviewStatus === "approved") {
    return (
      <p className="flex items-center gap-1.5 type-caption text-success">
        <Star size={14} aria-hidden="true" className="fill-current" />
        Reviewed. Thank you!
      </p>
    );
  }
  if (item.reviewStatus) {
    return (
      <p className="flex items-center gap-1.5 type-caption text-soft-ink">
        <Star size={14} aria-hidden="true" />
        Review sent. It appears once we&rsquo;ve checked it.
      </p>
    );
  }
  if (!item.canReview) return null;
  return (
    <Button variant="secondary" size="sm" onClick={() => onWrite(item)}>
      <PenLine size={16} aria-hidden="true" />
      Write a review
    </Button>
  );
}

/**
 * Everything about one order: status timeline with times, courier, address
 * (when the viewer may see it), items with reviews, and the totals. Shared
 * by Track order and the account's order page.
 */
function OrderDetails({
  order,
  proof,
  onReviewed,
  headingLevel = 1,
}: {
  order: OrderView;
  proof?: { orderNumber: string; phone: string };
  onReviewed: () => void;
  headingLevel?: 1 | 2;
}) {
  const [reviewing, setReviewing] = useState<OrderItem | null>(null);
  const expected = deliveryWindow(order);
  const Heading = `h${headingLevel}` as const;
  const c = order.customer;
  const open = order.status !== "delivered" && !order.closed;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <Heading className="type-h2 text-ink">
            Order <span className="figures">#{order.orderNumber}</span>
          </Heading>
          <p className="mt-1 type-body text-soft-ink">
            Placed {formatDateTime(order.placedAt)}
          </p>
        </div>
        <StatusChip status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card title="Where it is">
            <OrderTimeline steps={order.timeline} closed={order.closed} />
            {(open && expected) || order.courier ? (
              <div className="mt-6 space-y-4 border-t border-sand-line pt-5">
                {open && expected && (
                  <p className="flex gap-3 type-body text-ink">
                    <CalendarDays
                      size={20}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-rosewood"
                    />
                    <span>
                      Expected {formatDate(expected[0])} to{" "}
                      {formatDate(expected[1])}
                    </span>
                  </p>
                )}
                {order.courier && (
                  <div className="flex gap-3 type-body text-ink">
                    <Truck
                      size={20}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-rosewood"
                    />
                    <div className="min-w-0">
                      <p>
                        With {order.courier.name ?? "our courier"}
                        {order.courier.trackingCode && (
                          <>
                            {" "}
                            · code{" "}
                            <span className="figures font-semibold">
                              {order.courier.trackingCode}
                            </span>
                          </>
                        )}
                      </p>
                      {order.courier.trackingUrl && (
                        <a
                          href={order.courier.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex min-h-11 items-center gap-1.5 link"
                        >
                          Track on the courier&rsquo;s site
                          <ExternalLink size={16} aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

          <Card title="Delivery">
            <p className="flex gap-3 type-body text-ink">
              <MapPin
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-rosewood"
              />
              <span>
                {c.name}
                {c.phone && (
                  <>
                    {" "}
                    · <span className="figures">{c.phone}</span>
                  </>
                )}
                <br />
                {c.addressLine && (
                  <>
                    {c.addressLine}
                    <br />
                  </>
                )}
                {c.area}, {c.district}
                {c.division && `, ${c.division}`}
              </span>
            </p>
            {c.deliveryNote && (
              <p className="mt-3 type-caption text-soft-ink">
                Note: {c.deliveryNote}
              </p>
            )}
          </Card>
        </div>

        <Card title="Items">
          <OrderItems
            items={order.items}
            action={(item) => (
              <ReviewAction item={item} onWrite={setReviewing} />
            )}
          />
          <OrderTotals
            order={order}
            className="mt-5 border-t border-sand-line pt-4"
          />
        </Card>
      </div>

      <ReviewDialog
        key={reviewing?.id ?? "none"}
        item={reviewing}
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        onDone={onReviewed}
        defaultName={c.name}
        proof={proof}
      />
    </div>
  );
}

export default OrderDetails;
