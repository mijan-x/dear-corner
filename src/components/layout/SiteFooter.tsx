import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import Logo from "../brand/Logo";
import NewsletterForm from "./NewsletterForm";
import { useShopSettings, type ShopSettings } from "../../services/settings";
import { useStorefrontNav } from "../../services/catalog";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";

type FooterLink = { to: string; label: string; external?: boolean };

const linkClass =
  "inline-flex min-h-11 items-center text-[15px] leading-5 text-linen/90 underline-offset-[5px] decoration-lamp-glow decoration-2 hover:text-linen hover:underline";

function FooterLinks({ links }: { links: FooterLink[] }) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.to}>
          {link.external ? (
            <a
              href={link.to}
              className={linkClass}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ) : (
            <Link to={link.to} className={linkClass}>
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A column on desktop, a collapsible section on phones. */
function FooterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <details className="dc-details group border-b border-linen/15 md:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-semibold text-linen [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown
            size={20}
            aria-hidden="true"
            className="transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="pb-4">{children}</div>
      </details>
      <div className="hidden md:block">
        <h2 className="mb-2 type-eyebrow text-lamp-glow">{title}</h2>
        {children}
      </div>
    </>
  );
}

function contactLines(settings: ShopSettings) {
  const lines: ReactNode[] = [];
  if (settings.contact_phone) {
    lines.push(
      <a
        key="phone"
        href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
        className={linkClass}
      >
        {settings.contact_phone}
      </a>,
    );
  }
  if (settings.contact_whatsapp) {
    const digits = settings.contact_whatsapp
      .replace(/\D/g, "")
      .replace(/^0/, "880");
    lines.push(
      <a
        key="wa"
        href={`https://wa.me/${digits}`}
        className={linkClass}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp <span className="ml-1">{settings.contact_whatsapp}</span>
      </a>,
    );
  }
  if (settings.contact_email) {
    lines.push(
      <a
        key="email"
        href={`mailto:${settings.contact_email}`}
        className={linkClass}
      >
        {settings.contact_email}
      </a>,
    );
  }
  return lines;
}

/**
 * Footer (brand doc section 6): Night Plum with Warm Linen text (16.9:1),
 * the cream logo with tagline, four columns on desktop (brand and social,
 * Shop, Help, contact and hours) and collapsible sections on phones. Contact
 * details appear once they are filled in under admin Settings.
 */
function SiteFooter({ className }: { className?: string }) {
  const { settings } = useShopSettings();
  const nav = useStorefrontNav();
  const year = new Date().getFullYear();

  const shopLinks: FooterLink[] = [
    { to: routes.shop, label: "Shop all" },
    ...nav.collections.map((c) => ({
      to: routes.collection(c.slug),
      label: c.name,
    })),
    ...nav.categories.map((c) => ({
      to: routes.category(c.slug),
      label: c.name,
    })),
  ];
  const helpLinks: FooterLink[] = [
    { to: routes.trackOrder, label: "Track your order" },
    { to: routes.delivery, label: "Delivery" },
    { to: routes.returns, label: "Exchange and returns" },
    { to: routes.faq, label: "FAQ" },
    { to: routes.contact, label: "Contact us" },
    { to: routes.about, label: "About Dear Corner" },
  ];
  const social: FooterLink[] = [
    settings.instagram_url && {
      to: settings.instagram_url,
      label: "Instagram",
      external: true,
    },
    settings.facebook_url && {
      to: settings.facebook_url,
      label: "Facebook",
      external: true,
    },
    settings.tiktok_url && {
      to: settings.tiktok_url,
      label: "TikTok",
      external: true,
    },
  ].filter(Boolean) as FooterLink[];
  const contacts = contactLines(settings);

  return (
    <footer className={cx("surface-dark bg-night-plum text-linen", className)}>
      <div className="container-page">
        <div className="grid gap-6 border-b border-linen/15 py-10 md:grid-cols-2 md:items-end md:py-12">
          <div>
            <h2 className="type-h3 text-linen">New pieces, first.</h2>
            <p className="mt-1 type-body text-linen/75">
              One short email when new things land in the shop.
            </p>
          </div>
          <div className="md:justify-self-end">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-2 py-10 md:grid-cols-3 md:gap-y-10 md:py-14 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="mb-6 md:col-span-3 md:mb-0 md:flex md:items-end md:justify-between md:gap-10 xl:col-span-1 xl:block">
            <Link
              to={routes.home}
              className="inline-block rounded-control"
              aria-label="Dear Corner, home"
            >
              <Logo variant="horizontal-tagline-cream" width={300} decorative />
            </Link>
            <p className="mt-5 max-w-xs type-body text-linen/75 md:mt-0 xl:mt-5">
              Room decor, lamps, desk picks and gifts, delivered across
              Bangladesh. Pay when it arrives.
            </p>
            {social.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-x-5">
                {social.map((link) => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className={linkClass}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FooterSection title="Shop">
            <FooterLinks links={shopLinks} />
          </FooterSection>
          <FooterSection title="Help">
            <FooterLinks links={helpLinks} />
          </FooterSection>
          <FooterSection title="Contact">
            {contacts.length > 0 && (
              <ul>
                {contacts.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            {settings.contact_address && (
              <p className="mt-2 type-body text-linen/80">
                {settings.contact_address}
              </p>
            )}
            {settings.opening_hours && (
              <p className="mt-3 type-body text-linen/80">
                <span className="font-semibold text-linen">Open: </span>
                {settings.opening_hours}
              </p>
            )}
            {settings.reply_time && (
              <p className="mt-1 type-caption text-linen/70">
                {settings.reply_time}
              </p>
            )}
            {contacts.length === 0 && !settings.contact_address && (
              <p className="type-body text-linen/80">
                Questions about an order or a product?{" "}
                <Link
                  to={routes.contact}
                  className="text-linen underline decoration-lamp-glow decoration-2 underline-offset-[5px]"
                >
                  Send us a message
                </Link>
                .
              </p>
            )}
          </FooterSection>
        </div>

        <div className="flex flex-col gap-3 border-t border-linen/15 py-6 type-caption text-linen/70 md:flex-row md:items-center md:justify-between">
          <p>&copy; {year} Dear Corner. Payment: Cash on Delivery.</p>
          <ul className="flex gap-x-5">
            <li>
              <Link
                to={routes.privacy}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:text-linen hover:underline"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                to={routes.terms}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:text-linen hover:underline"
              >
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
