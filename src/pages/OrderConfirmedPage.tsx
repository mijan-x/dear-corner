import { useParams } from "react-router";
import { Banknote, CalendarDays, Check, MapPin, PhoneCall } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import PageLoader from "../components/system/PageLoader";
import OrderItems from "../components/order/OrderItems";
import OrderTotals from "../components/order/OrderTotals";
import Sparkle from "../components/brand/Sparkle";
import { useAuth } from "../features/auth/session";
import { recallOrder } from "../features/checkout/lastOrder";
import { usePageMeta } from "../hooks/usePageMeta";
import { useQuery } from "../lib/query";
import { routes } from "../lib/routes";
import {
  deliveryWindow,
  fetchMyOrder,
  type OrderView,
} from "../services/orders";
import { formatDate } from "../utils/formatDate";
import { formatPrice } from "../utils/formatPrice";

function trackHref(orderNumber: string) {
  return `${routes.trackOrder}?order=${encodeURIComponent(orderNumber)}`;
}

/** The big tick, drawn once (still for reduced motion). */
function SuccessMark() {
  return (
    <span className="relative grid size-20 place-items-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-pop rounded-full bg-lamp-glow/50"
      />
      <span className="relative grid size-14 animate-pop place-items-center rounded-full bg-success text-white [animation-delay:120ms]">
        <Check size={30} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </span>
  );
}

function Detail({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-rosewood">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="type-label text-ink">{title}</h3>
        <div className="mt-0.5 type-body text-soft-ink">{children}</div>
      </div>
    </div>
  );
}

function Confirmation({ order }: { order: OrderView }) {
  const firstName = order.customer.name.trim().split(/\s+/)[0] || "friend";
  const expected = deliveryWindow(order);
  const c = order.customer;
  return (
    <div className="container-page pt-10 pb-20 md:pt-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <SuccessMark />
          <p className="mt-6 flex items-center gap-2 type-eyebrow text-terracotta-deep">
            <Sparkle size={12} className="text-rosewood" />
            Order placed
          </p>
          <h1 className="mt-2 type-h1 text-ink">Thank you, {firstName}!</h1>
          <p className="mt-3 max-w-xl type-body-lg text-soft-ink">
            We&rsquo;ve got your order{" "}
            <span className="figures font-semibold text-ink">
              #{order.orderNumber}
            </span>
            . We&rsquo;ll call you soon to confirm it.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section
            aria-labelledby="next-title"
            className="space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-6"
          >
            <h2 id="next-title" className="type-h3 text-ink">
              What happens next
            </h2>
            <Detail icon={<PhoneCall size={20} />} title="We call to confirm">
              On <span className="figures">{c.phone}</span>, usually within a
              few hours.
            </Detail>
            <Detail icon={<CalendarDays size={20} />} title="Expected delivery">
              {expected ? (
                <>
                  {formatDate(expected[0])} to {formatDate(expected[1])}
                  {order.delivery.zoneName && <> ({order.delivery.zoneName})</>}
                </>
              ) : (
                "We'll tell you when we call."
              )}
            </Detail>
            <Detail icon={<MapPin size={20} />} title="Delivery address">
              {c.name}
              <br />
              {c.addressLine && (
                <>
                  {c.addressLine}
                  <br />
                </>
              )}
              {c.area}, {c.district}, {c.division}
            </Detail>
            <Detail icon={<Banknote size={20} />} title="Cash on Delivery">
              Pay{" "}
              <span className="figures font-semibold text-ink">
                {formatPrice(order.total)}
              </span>{" "}
              when it arrives. Check your parcel at the door first.
            </Detail>
          </section>

          <section
            aria-labelledby="items-title"
            className="space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-6"
          >
            <h2 id="items-title" className="type-h3 text-ink">
              Your order
            </h2>
            <OrderItems items={order.items} />
            <OrderTotals
              showPayment={false}
              order={order}
              className="border-t border-sand-line pt-4"
            />
          </section>
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <ButtonLink to={trackHref(order.orderNumber)}>
            Track your order
          </ButtonLink>
          <ButtonLink to={routes.shop} variant="secondary">
            Continue shopping
          </ButtonLink>
        </div>
        <p className="mt-5 text-center type-caption text-soft-ink">
          Keep your order number. You can track it with the phone number you
          used.
        </p>
      </div>
    </div>
  );
}

/**
 * Order confirmation (brand doc page 8). Shows the order just placed in
 * this tab; a signed-in customer can also open it later from here.
 */
function OrderConfirmedPage() {
  const { orderNumber = "" } = useParams();
  usePageMeta({ title: "Order placed", noindex: true });
  const auth = useAuth();
  const remembered = recallOrder(orderNumber);
  const signedIn = auth.status === "signed-in";
  const lookup = useQuery(
    !remembered && signedIn ? `my-order:${orderNumber}` : null,
    () => fetchMyOrder(orderNumber),
  );
  const order = remembered ?? lookup.data ?? null;

  if (order) return <Confirmation order={order} />;
  if (
    auth.status === "loading" ||
    (signedIn && !lookup.error && lookup.data === undefined)
  ) {
    return <PageLoader />;
  }

  // Opened in another tab or device without the order to hand.
  return (
    <div className="container-page pt-16 pb-20 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <SuccessMark />
        <h1 className="mt-6 type-h1 text-ink">Your order is with us</h1>
        <p className="mt-3 type-body-lg text-soft-ink">
          Order{" "}
          <span className="figures font-semibold text-ink">#{orderNumber}</span>
          . Use the phone number you ordered with to see where it is.
        </p>
        <ButtonLink to={trackHref(orderNumber)} className="mt-8">
          Track your order
        </ButtonLink>
      </div>
    </div>
  );
}

export default OrderConfirmedPage;
