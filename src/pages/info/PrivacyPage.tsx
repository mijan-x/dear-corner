import { Link } from "react-router";
import {
  ContentList,
  ContentPage,
  ContentSection,
} from "../../components/content/ContentPage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../lib/routes";

/** Privacy policy, in plain words. Describes what the shop actually stores. */
function PrivacyPage() {
  usePageMeta({
    title: "Privacy",
    description:
      "What Dear Corner collects when you shop, why, who it's shared with and how to ask us to delete it.",
  });

  return (
    <ContentPage
      eyebrow="Policies"
      title="Privacy"
      updated="22 October 2026"
      intro={
        <p>
          We collect only what we need to deliver your order and look after you.
          We never sell your details.
        </p>
      }
    >
      <ContentSection title="What we collect" id="collect">
        <ContentList>
          <li>
            <strong className="font-semibold text-ink">When you order:</strong>{" "}
            your name, mobile number, delivery address, the items you buy and
            your email if you give it.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              When you make an account:
            </strong>{" "}
            your email, saved addresses, wishlist and bag, and a password if you
            choose to set one (stored only in scrambled form).
          </li>
          <li>
            <strong className="font-semibold text-ink">
              When you write to us or review:
            </strong>{" "}
            the message or review and the details you include.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              When you join the newsletter:
            </strong>{" "}
            your email address.
          </li>
        </ContentList>
        <p>
          We don&rsquo;t take payment online, so we never see or store card or
          mobile banking details.
        </p>
      </ContentSection>

      <ContentSection title="How we use it" id="use">
        <ContentList>
          <li>To confirm your order by phone and deliver it.</li>
          <li>To show your order status and history.</li>
          <li>To answer your messages and publish reviews you send.</li>
          <li>
            To send the newsletter, only if you signed up. You can ask us to
            remove you any time.
          </li>
          <li>
            To prevent fake orders and abuse (for example, too many open orders
            on one number).
          </li>
        </ContentList>
      </ContentSection>

      <ContentSection title="Who we share it with" id="share">
        <ContentList>
          <li>
            <strong className="font-semibold text-ink">Our courier:</strong>{" "}
            your name, phone, address and the amount to collect, so they can
            deliver.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              The services that run the shop:
            </strong>{" "}
            Supabase stores our database (in Singapore), Vercel hosts the
            website and Google (Gmail) sends our sign-in emails. They handle
            data only to provide those services.
          </li>
          <li>Authorities, only if the law requires it.</li>
        </ContentList>
      </ContentSection>

      <ContentSection title="Cookies and storage" id="cookies">
        <p>
          The site keeps a few things in your browser so it works: your bag,
          your sign-in and recently loaded pages. We don&rsquo;t use advertising
          or tracking cookies.
        </p>
      </ContentSection>

      <ContentSection title="Your choices" id="choices">
        <p>
          You can see and edit your addresses and profile in your account. To
          get a copy of your details, correct them, or have your account and
          details deleted,{" "}
          <Link to={routes.contact} className="link">
            send us a message
          </Link>
          . We keep order records as long as we need them for accounts and the
          law.
        </p>
      </ContentSection>

      <ContentSection title="Changes" id="changes">
        <p>
          If we change this policy, we&rsquo;ll update the date at the top of
          this page.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

export default PrivacyPage;
