import type { ReactNode } from "react";
import { Link } from "react-router";
import Accordion from "../../components/ui/Accordion";
import {
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";
import { useShopSettings } from "../../services/settings";
import { formatPrice } from "../../utils/formatPrice";

type Faq = { q: string; a: ReactNode };

function useFaqGroups(): { title: string; id: string; items: Faq[] }[] {
  const { settings } = useShopSettings();
  const threshold = settings.free_delivery_threshold;
  return [
    {
      title: "Ordering",
      id: "ordering",
      items: [
        {
          q: "Do I need an account to order?",
          a: (
            <p>
              No. You can check out as a guest with your name, phone and
              address. An account keeps your orders, addresses and wishlist in
              one place.
            </p>
          ),
        },
        {
          q: "Why do you call me after I order?",
          a: (
            <p>
              Every order is Cash on Delivery, so we call to confirm it before
              we send it. Please keep your phone close after ordering.
            </p>
          ),
        },
        {
          q: "Can I change or cancel my order?",
          a: (
            <p>
              Yes, until we hand it to the courier. Tell us on the confirmation
              call or{" "}
              <Link to={routes.contact} className="link">
                send us a message
              </Link>{" "}
              with your order number.
            </p>
          ),
        },
        {
          q: "How do I use a coupon?",
          a: (
            <p>
              Enter the code in your bag or at checkout. The discount shows
              before you place the order.
            </p>
          ),
        },
      ],
    },
    {
      title: "Delivery and payment",
      id: "delivery",
      items: [
        {
          q: "How much is delivery and how long does it take?",
          a: (
            <p>
              It depends on whether you&rsquo;re inside or outside Dhaka city.
              {threshold
                ? ` Orders of ${formatPrice(threshold)} or more deliver free.`
                : ""}{" "}
              See the{" "}
              <Link to={routes.delivery} className="link">
                Delivery
              </Link>{" "}
              page for current fees and times.
            </p>
          ),
        },
        {
          q: "How do I pay?",
          a: (
            <p>
              In cash to the rider when your parcel arrives. We don&rsquo;t take
              payment online yet.
            </p>
          ),
        },
        {
          q: "Where is my order?",
          a: (
            <p>
              Use{" "}
              <Link to={routes.trackOrder} className="link">
                Track your order
              </Link>{" "}
              with your order number (like DC-10482) and phone. Once it&rsquo;s
              with the courier you&rsquo;ll also see their tracking link.
            </p>
          ),
        },
      ],
    },
    {
      title: "Exchange and returns",
      id: "returns",
      items: [
        {
          q: "What if I don’t like it when it arrives?",
          a: (
            <p>
              Check your parcel at the door. If you don&rsquo;t want it, hand it
              back to the rider and pay only the delivery charge.
            </p>
          ),
        },
        {
          q: "What if it’s wrong, damaged or faulty?",
          a: (
            <p>
              At the door, hand it back and pay nothing. If you notice a fault
              after the rider has left, tell us within 24 hours with photos and
              we&rsquo;ll replace it. Details are on{" "}
              <Link to={routes.returns} className="link">
                Exchange and returns
              </Link>
              .
            </p>
          ),
        },
      ],
    },
    {
      title: "Products and account",
      id: "products",
      items: [
        {
          q: "Will the item look like the photos?",
          a: (
            <p>
              We try hard to show true colours and sizes. Screens differ a
              little, so colours can look slightly different in person. If
              you&rsquo;re unsure about a size,{" "}
              <Link to={routes.contact} className="link">
                ask us
              </Link>{" "}
              before you order.
            </p>
          ),
        },
        {
          q: "Can I leave a review?",
          a: (
            <p>
              Yes, once your order is delivered: from your account, or from
              Track your order if you checked out as a guest. We read every
              review before it appears.
            </p>
          ),
        },
        {
          q: "How do I sign in?",
          a: (
            <p>
              With your email: we send a 6-digit code. You can also set a
              password in your account&rsquo;s Profile and use that instead.
            </p>
          ),
        },
      ],
    },
  ];
}

/** FAQ: grouped questions on native <details>, one open per group. */
function FaqPage() {
  usePageMeta({
    title: "FAQ",
    description:
      "Answers about ordering, Cash on Delivery, delivery times, returns and your account at Dear Corner.",
  });
  const groups = useFaqGroups();

  return (
    <ContentPage
      eyebrow="Help"
      title="Questions and answers"
      intro={<p>The things people ask us most. Tap a question to open it.</p>}
    >
      {groups.map((group) => (
        <ContentSection key={group.id} id={group.id} title={group.title}>
          <div className="border-t border-sand-line">
            {group.items.map((item) => (
              <Accordion key={item.q} title={item.q} name={group.id}>
                <div className="type-body-lg text-soft-ink">{item.a}</div>
              </Accordion>
            ))}
          </div>
        </ContentSection>
      ))}
    </ContentPage>
  );
}

export default FaqPage;
