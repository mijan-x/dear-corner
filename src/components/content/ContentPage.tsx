import type { ReactNode } from "react";
import { Link } from "react-router";
import { MessageCircle, PackageSearch, CircleHelp } from "lucide-react";
import Breadcrumbs from "../ui/Breadcrumbs";
import Sparkle from "../brand/Sparkle";
import { routes } from "../../lib/routes";
import { useShopSettings } from "../../services/settings";
import { cx } from "../../utils/cx";

/**
 * Layout for the help and policy pages (About, Delivery, Returns, FAQ,
 * Privacy, Terms): breadcrumb, eyebrow with the sparkle, one H1, a short
 * intro, the body in a readable column and a help card beside it on desktop
 * (below it on phones).
 */
export function ContentPage({
  title,
  eyebrow,
  intro,
  updated,
  children,
  aside,
}: {
  title: string;
  eyebrow: string;
  intro?: ReactNode;
  /** "Last updated" date for policies, written out ("22 October 2026"). */
  updated?: string;
  children: ReactNode;
  /** Replaces the default help card. */
  aside?: ReactNode;
}) {
  return (
    <div className="container-page pt-4 pb-20 md:pt-6">
      <Breadcrumbs
        items={[{ label: "Home", to: routes.home }, { label: title }]}
      />

      <header className="mt-6 max-w-2xl">
        <p className="flex items-center gap-2 type-eyebrow text-terracotta-deep">
          <Sparkle size={12} className="text-rosewood" />
          {eyebrow}
        </p>
        <h1 className="mt-3 type-h1 text-ink">{title}</h1>
        {intro && (
          <div className="mt-4 type-body-lg text-soft-ink">{intro}</div>
        )}
        {updated && (
          <p className="mt-3 type-caption text-soft-ink">
            Last updated {updated}
          </p>
        )}
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="max-w-2xl">{children}</div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          {aside ?? <HelpCard />}
        </aside>
      </div>
    </div>
  );
}

/** One titled section of a content page. */
export function ContentSection({
  title,
  id,
  children,
  className,
}: {
  title: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cx("scroll-mt-28 not-first:mt-12", className)}
    >
      <h2 id={id ? `${id}-title` : undefined} className="type-h2 text-ink">
        {title}
      </h2>
      <div className="mt-4 space-y-4 type-body-lg text-ink/85">{children}</div>
    </section>
  );
}

/** Bulleted list in the brand style (rosewood markers). */
export function ContentList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-6 marker:text-rosewood">
      {children}
    </ul>
  );
}

/** "Still have a question?" card with the ways to reach the shop. */
export function HelpCard({ className }: { className?: string }) {
  const { settings } = useShopSettings();
  const whatsapp = settings.contact_whatsapp.replace(/\D/g, "");
  const links = [
    { to: routes.contact, label: "Send us a message", icon: MessageCircle },
    { to: routes.trackOrder, label: "Track your order", icon: PackageSearch },
    { to: routes.faq, label: "Read the FAQ", icon: CircleHelp },
  ];
  return (
    <div
      className={cx(
        "rounded-card border border-sand-line bg-paper p-5 md:p-6",
        className,
      )}
    >
      <h2 className="type-h3 text-ink">Still have a question?</h2>
      <p className="mt-2 type-body text-soft-ink">
        {settings.reply_time ||
          "Write to us and we'll get back to you as soon as we can."}
      </p>
      <ul className="mt-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-11 items-center gap-3 rounded-control px-2 type-body text-ink hover:bg-clay-blush/50 hover:text-rosewood"
            >
              <Icon size={20} aria-hidden="true" className="text-rosewood" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      {(settings.contact_phone || whatsapp) && (
        <div className="mt-4 space-y-1 border-t border-sand-line pt-4 type-body">
          {settings.contact_phone && (
            <p>
              Call{" "}
              <a
                className="link"
                href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
              >
                {settings.contact_phone}
              </a>
            </p>
          )}
          {whatsapp && (
            <p>
              WhatsApp{" "}
              <a
                className="link"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                {settings.contact_whatsapp}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
