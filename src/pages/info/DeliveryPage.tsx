import { Link } from "react-router";
import {
  ContentList,
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";
import { useShopSettings } from "../../services/settings";
import { dayRange, useShippingZones } from "../../services/shipping";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Delivery: fees and times come from the live shipping zones and the free
 * delivery threshold, so this page always matches checkout.
 */
function DeliveryPage() {
  usePageMeta({
    title: "Delivery",
    description:
      "Delivery fees, times and how Cash on Delivery works at Dear Corner, across Bangladesh.",
  });
  const zones = useShippingZones();
  const { settings } = useShopSettings();
  const threshold = settings.free_delivery_threshold;

  return (
    <ContentPage
      eyebrow="Help"
      title="Delivery"
      intro={
        <p>
          We deliver across Bangladesh and you pay in cash when your parcel
          arrives.
        </p>
      }
    >
      <ContentSection title="Fees and times" id="fees">
        <div className="overflow-hidden rounded-card border border-sand-line bg-paper">
          <table className="w-full text-left type-body">
            <caption className="sr-only">Delivery fee and time by area</caption>
            <thead className="bg-clay-blush/40 type-label text-ink">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Area
                </th>
                <th scope="col" className="px-4 py-3">
                  Fee
                </th>
                <th scope="col" className="px-4 py-3">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-line">
              {zones.map((zone) => (
                <tr key={zone.name}>
                  <th scope="row" className="px-4 py-3 font-semibold text-ink">
                    {zone.name}
                  </th>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPrice(zone.fee)}
                  </td>
                  <td className="px-4 py-3">{dayRange(zone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {threshold ? (
          <p>
            <strong className="font-semibold text-ink">
              Free delivery on orders of {formatPrice(threshold)} or more
            </strong>{" "}
            (after any coupon).
          </p>
        ) : null}
        <p>
          Inside Dhaka means Dhaka city (both city corporations). Everywhere
          else, including Savar and Keraniganj, is Outside Dhaka. Checkout shows
          your exact fee as soon as you choose your area.
        </p>
        <p>
          Times count from when we confirm your order. Holidays, weather and
          strikes can add a day or two.
        </p>
      </ContentSection>

      <ContentSection title="From order to doorstep" id="steps">
        <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-rosewood">
          <li>You place your order. No payment is needed online.</li>
          <li>
            We call the number you gave to confirm it. If we can&rsquo;t reach
            you after a few tries, the order may be cancelled.
          </li>
          <li>We pack it with care and hand it to the courier.</li>
          <li>
            You can follow it on{" "}
            <Link to={routes.trackOrder} className="link">
              Track your order
            </Link>{" "}
            with your order number and phone.
          </li>
          <li>
            The rider calls you on the way. You check the parcel and pay in
            cash.
          </li>
        </ol>
      </ContentSection>

      <ContentSection title="Good to know" id="good-to-know">
        <ContentList>
          <li>
            Please keep the exact amount ready if you can; riders don&rsquo;t
            always carry change.
          </li>
          <li>
            You can open and check your parcel while the rider waits. See{" "}
            <Link to={routes.returns} className="link">
              Exchange and returns
            </Link>{" "}
            for what to do if something isn&rsquo;t right.
          </li>
          <li>
            Need to change your address or phone? Message us before the parcel
            is handed to the courier.
          </li>
          <li>Up to 3 open orders per phone number at a time.</li>
        </ContentList>
      </ContentSection>
    </ContentPage>
  );
}

export default DeliveryPage;
