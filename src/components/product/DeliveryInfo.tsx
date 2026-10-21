import { HandCoins, PackageOpen, Truck } from "lucide-react";
import { dayRange, useShippingZones } from "../../services/shipping";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Delivery times and fees from the Shipping settings, Cash on Delivery and
 * the at-the-door check (owner decisions). No promises beyond those.
 */
function DeliveryInfo({
  freeDeliveryThreshold,
}: {
  freeDeliveryThreshold: number | null;
}) {
  const zones = useShippingZones();
  return (
    <ul className="divide-y divide-sand-line rounded-card border border-sand-line bg-paper">
      <li className="flex gap-3.5 p-4">
        <Truck
          size={22}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-rosewood"
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Delivery</p>
          <ul className="mt-1 space-y-0.5 type-caption text-soft-ink">
            {zones.map((zone) => (
              <li key={zone.name}>
                {zone.name}: {dayRange(zone)},{" "}
                <span className="figures">{formatPrice(zone.fee)}</span>
              </li>
            ))}
            {freeDeliveryThreshold && (
              <li className="font-medium text-success">
                Free on orders over{" "}
                <span className="figures">
                  {formatPrice(freeDeliveryThreshold)}
                </span>
              </li>
            )}
          </ul>
        </div>
      </li>
      <li className="flex gap-3.5 p-4">
        <HandCoins
          size={22}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-rosewood"
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Cash on Delivery</p>
          <p className="mt-1 type-caption text-soft-ink">
            Pay when it arrives. We call you to confirm the order before it's
            sent.
          </p>
        </div>
      </li>
      <li className="flex gap-3.5 p-4">
        <PackageOpen
          size={22}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-rosewood"
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Check it at the door</p>
          <p className="mt-1 type-caption text-soft-ink">
            Not what you expected? Hand it back to the rider and pay only the
            delivery charge.
          </p>
        </div>
      </li>
    </ul>
  );
}

export default DeliveryInfo;
