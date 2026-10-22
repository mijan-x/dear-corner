import { Link } from "react-router";
import {
  ContentList,
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";

/** Terms of sale, in plain words, matching how checkout actually works. */
function TermsPage() {
  usePageMeta({
    title: "Terms",
    description:
      "The terms for buying from Dear Corner: orders, prices, Cash on Delivery, delivery and returns.",
  });

  return (
    <ContentPage
      eyebrow="Policies"
      title="Terms of sale"
      updated="22 October 2026"
      intro={
        <p>
          By placing an order on Dear Corner you agree to these terms. They are
          written to be read, so please do.
        </p>
      }
    >
      <ContentSection title="Orders" id="orders">
        <ContentList>
          <li>
            Placing an order sends us a request. It&rsquo;s accepted when we
            confirm it with you by phone.
          </li>
          <li>
            We may cancel an order if we can&rsquo;t reach you to confirm it, if
            an item is out of stock, or if the details look wrong or fraudulent.
            We&rsquo;ll tell you if we do.
          </li>
          <li>Each phone number can have up to 3 open orders at a time.</li>
        </ContentList>
      </ContentSection>

      <ContentSection title="Prices and payment" id="prices">
        <ContentList>
          <li>
            Prices are in Bangladeshi taka (৳). The total you see at checkout,
            including delivery and any coupon, is the amount you pay.
          </li>
          <li>
            Payment is Cash on Delivery: you pay the rider when your parcel
            arrives.
          </li>
          <li>
            If a price on the site is clearly wrong, we&rsquo;ll call you before
            sending the order.
          </li>
          <li>
            Coupons follow the rules shown with them and can&rsquo;t be
            exchanged for cash.
          </li>
        </ContentList>
      </ContentSection>

      <ContentSection title="Delivery" id="delivery">
        <p>
          Fees and estimated times are on the{" "}
          <Link to={routes.delivery} className="link">
            Delivery
          </Link>{" "}
          page. Times are estimates; delays caused by couriers, holidays or
          weather can happen.
        </p>
      </ContentSection>

      <ContentSection title="Exchange and returns" id="returns">
        <p>
          Please check your parcel at the door. Our rules for items you
          don&rsquo;t want and for wrong, damaged or faulty items are on{" "}
          <Link to={routes.returns} className="link">
            Exchange and returns
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="Products" id="products">
        <p>
          We describe and photograph every product as accurately as we can.
          Handmade and natural materials can vary slightly, and colours can look
          a little different on different screens.
        </p>
      </ContentSection>

      <ContentSection title="Reviews and messages" id="reviews">
        <p>
          Reviews are from customers whose orders were delivered, and we read
          each one before it appears. We don&rsquo;t publish reviews that are
          abusive, off-topic or share someone&rsquo;s personal details.
        </p>
      </ContentSection>

      <ContentSection title="Your details" id="privacy">
        <p>
          How we handle your information is explained in our{" "}
          <Link to={routes.privacy} className="link">
            Privacy
          </Link>{" "}
          policy.
        </p>
      </ContentSection>

      <ContentSection title="Changes and law" id="law">
        <p>
          We may update these terms; the version on this page when you order
          applies to that order. These terms are governed by the laws of
          Bangladesh.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

export default TermsPage;
