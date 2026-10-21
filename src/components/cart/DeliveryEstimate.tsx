import { Truck } from "lucide-react";
import FreeDeliveryProgress from "../ui/FreeDeliveryProgress";
import { dayRange } from "../../services/shipping";
import { formatPrice } from "../../utils/formatPrice";
import type { Quote } from "../../services/cart";

/**
 * Before an address is known: what delivery costs and how long it takes
 * in each zone, and how far the cart is from free delivery.
 */
function DeliveryEstimate({ quote }: { quote: Quote }) {
  const d = quote.delivery;
  const afterDiscount = quote.subtotal - quote.discount;
  const free =
    d.freeThreshold !== null &&
    d.freeThreshold > 0 &&
    afterDiscount >= d.freeThreshold;
  return (
    <div className="space-y-3">
      <FreeDeliveryProgress
        amount={afterDiscount}
        threshold={d.freeThreshold}
      />
      {quote.zones.length > 0 && (
        <div className="flex gap-2.5 type-caption text-soft-ink">
          <Truck
            size={18}
            aria-hidden="true"
            className="mt-px shrink-0 text-rosewood"
          />
          <ul className="space-y-0.5">
            {quote.zones.map((zone) => (
              <li key={zone.name}>
                <span className="font-medium text-ink">{zone.name}</span>:{" "}
                {dayRange(zone)},{" "}
                {free ? (
                  <span className="font-medium text-success">free</span>
                ) : (
                  <span className="figures">{formatPrice(zone.fee)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DeliveryEstimate;
