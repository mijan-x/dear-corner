import { HandCoins, PackageOpen, PhoneCall, Truck } from "lucide-react";
import Reveal from "../motion/Reveal";
import { dayRange, useShippingZones } from "../../services/shipping";
import { formatPrice } from "../../utils/formatPrice";

/**
 * The shop's real promises only (owner decisions, 20 Oct 2026): Cash on
 * Delivery, the free-delivery threshold and delivery times from the
 * Shipping settings, checking the parcel at the door, and the confirmation
 * call.
 */
function PromiseStrip({
  freeDeliveryThreshold,
}: {
  freeDeliveryThreshold: number | null;
}) {
  const zones = useShippingZones();
  const times = zones.map((z) => `${z.name} ${dayRange(z)}`).join(", ");
  const items = [
    {
      icon: HandCoins,
      title: "Cash on Delivery",
      text: "Pay when your parcel arrives. No advance payment.",
    },
    {
      icon: Truck,
      title: freeDeliveryThreshold
        ? `Free delivery over ${formatPrice(freeDeliveryThreshold)}`
        : "Delivery across Bangladesh",
      text: times ? `${times}.` : "Delivered across Bangladesh.",
    },
    {
      icon: PackageOpen,
      title: "Check it at the door",
      text: "Not right? Hand it back to the rider and pay only the delivery charge.",
    },
    {
      icon: PhoneCall,
      title: "We call to confirm",
      text: "Every order is confirmed by phone before it's sent.",
    },
  ];

  return (
    <section
      aria-labelledby="promises-title"
      className="border-t border-sand-line bg-soft-sand/50"
    >
      <h2 id="promises-title" className="sr-only">
        Shopping with Dear Corner
      </h2>
      <ul className="container-page grid gap-x-8 gap-y-7 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:py-12">
        {items.map(({ icon: Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 60} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-clay-blush text-rosewood">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col pt-0.5">
              <span className="font-semibold text-ink">{title}</span>
              <span className="mt-0.5 type-caption text-soft-ink">{text}</span>
            </span>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default PromiseStrip;
