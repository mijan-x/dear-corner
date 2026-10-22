import { Link } from "react-router";
import { HandHeart, PackageCheck, Sparkles, Wallet } from "lucide-react";
import {
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import { ButtonLink } from "../../components/ui/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";

const promises = [
  {
    icon: Sparkles,
    title: "Chosen one by one",
    body: "Every piece is picked for how it looks and feels in a real room, not to fill a catalogue.",
  },
  {
    icon: Wallet,
    title: "Pay when it arrives",
    body: "Cash on Delivery across Bangladesh, and we call to confirm every order first.",
  },
  {
    icon: PackageCheck,
    title: "Check it at the door",
    body: "Open your parcel while the rider waits. If it isn't right, hand it back.",
  },
  {
    icon: HandHeart,
    title: "Real people answer",
    body: "Questions before or after you order go to us, not to a bot.",
  },
];

/** About (brand doc: "Little Things, Lovely Spaces."). */
function AboutPage() {
  usePageMeta({
    title: "About us",
    description:
      "Dear Corner finds small, lovely things for your room: decor, lamps, desk picks and gifts, delivered across Bangladesh with Cash on Delivery.",
  });

  return (
    <ContentPage
      eyebrow="Our story"
      title="About Dear Corner"
      intro={
        <p>
          Little Things, Lovely Spaces. We look for the small pieces that make a
          room feel like yours: a warm lamp for the evening, a notebook you want
          to write in, a gift that feels thought about.
        </p>
      }
    >
      <ContentSection title="What we do">
        <p>
          Dear Corner is an online shop for room decor, lighting, desk and
          stationery, accessories and gifts. We keep the range small on purpose,
          so everything in the shop is something we&rsquo;d happily put in our
          own corner.
        </p>
        <p>
          We deliver across Bangladesh and you pay in cash when your parcel
          arrives. No card, no advance, no surprises at the door.
        </p>
      </ContentSection>

      <ContentSection title="Our promises">
        <ul className="grid gap-4 sm:grid-cols-2">
          {promises.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-card border border-sand-line bg-paper p-5"
            >
              <Icon size={24} aria-hidden="true" className="text-rosewood" />
              <h3 className="mt-3 type-card-title text-ink">{title}</h3>
              <p className="mt-1 type-body text-soft-ink">{body}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="How ordering works">
        <p>
          Add what you like to your bag and check out with your name, phone and
          address. We call you to confirm, then hand your parcel to the courier.
          You can follow it any time on{" "}
          <Link to={routes.trackOrder} className="link">
            Track your order
          </Link>
          .
        </p>
        <p>
          Delivery fees and times are on the{" "}
          <Link to={routes.delivery} className="link">
            Delivery
          </Link>{" "}
          page, and what happens if something isn&rsquo;t right is on{" "}
          <Link to={routes.returns} className="link">
            Exchange and returns
          </Link>
          .
        </p>
        <div className="pt-2">
          <ButtonLink to={routes.shop}>Browse the shop</ButtonLink>
        </div>
      </ContentSection>
    </ContentPage>
  );
}

export default AboutPage;
