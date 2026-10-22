import { Link } from "react-router";
import {
  ContentList,
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import Notice from "../../components/ui/Notice";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";

/**
 * Exchange and returns. Shop rules: check at
 * the door; change of mind = hand it back and pay only delivery; faults found
 * later reported within 24 hours with photos; no delivery charge for wrong or
 * damaged items.
 */
function ReturnsPage() {
  usePageMeta({
    title: "Exchange and returns",
    description:
      "Check your Dear Corner parcel at the door. What to do if an item is wrong, damaged or faulty.",
  });

  return (
    <ContentPage
      eyebrow="Help"
      title="Exchange and returns"
      updated="22 October 2026"
      intro={
        <p>
          The easiest way to be sure: open and check your parcel while the rider
          is still with you.
        </p>
      }
    >
      <ContentSection title="Check it at the door" id="at-the-door">
        <p>
          When the rider arrives, open the parcel and look at everything before
          you pay.
        </p>
        <ContentList>
          <li>
            <strong className="font-semibold text-ink">Happy with it?</strong>{" "}
            Pay the rider and enjoy.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              Changed your mind?
            </strong>{" "}
            Hand the parcel back to the rider and pay only the delivery charge.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              Wrong or damaged item?
            </strong>{" "}
            Hand it back to the rider. You pay nothing, not even the delivery
            charge, and we&rsquo;ll call you to arrange the right one.
          </li>
        </ContentList>
      </ContentSection>

      <ContentSection
        title="Found a problem after delivery?"
        id="after-delivery"
      >
        <p>
          If an item turns out to be faulty or damaged after the rider has left,
          tell us{" "}
          <strong className="font-semibold text-ink">
            within 24 hours of delivery
          </strong>
          :
        </p>
        <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-rosewood">
          <li>
            Send us a message on the{" "}
            <Link to={routes.contact} className="link">
              Contact
            </Link>{" "}
            page with your order number and a short description.
          </li>
          <li>
            We&rsquo;ll ask for clear photos (or a short video) of the item and
            the packaging.
          </li>
          <li>
            Once we confirm the fault, we replace the item, or refund it if
            it&rsquo;s out of stock. There&rsquo;s no delivery charge for a
            replacement.
          </li>
        </ol>
        <Notice tone="info">
          Please keep the item, its box and anything that came with it until
          we&rsquo;ve sorted it out.
        </Notice>
      </ContentSection>

      <ContentSection title="What we can’t take back" id="not-returnable">
        <ContentList>
          <li>Items returned for a change of mind after the rider has left.</li>
          <li>Problems reported more than 24 hours after delivery.</li>
          <li>
            Damage from use, accidents or wear after delivery, or items that
            aren&rsquo;t in their original condition.
          </li>
        </ContentList>
      </ContentSection>

      <ContentSection title="Refunds" id="refunds">
        <p>
          You only pay when the parcel arrives, so most problems are solved at
          the door with nothing to refund. When a refund is due, we call you to
          agree how you&rsquo;d like to receive it.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

export default ReturnsPage;
