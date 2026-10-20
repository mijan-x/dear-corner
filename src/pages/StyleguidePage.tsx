import type { ReactNode } from "react";
import {
  Clock,
  Gift,
  Heart,
  House,
  Lamp,
  Menu,
  PackageSearch,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Logo from "../components/brand/Logo";
import LeafSprig from "../components/brand/LeafSprig";
import Sparkle from "../components/brand/Sparkle";
import Button, { ButtonLink } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import Badge from "../components/ui/Badge";
import Price from "../components/ui/Price";
import Rating from "../components/ui/Rating";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";
import { emptyCopy, errorCopy } from "../components/ui/emptyStateCopy";
import Spinner from "../components/ui/Spinner";
import { ProductGridSkeleton, Skeleton } from "../components/ui/Skeleton";
import Accordion from "../components/ui/Accordion";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import SectionHeading from "../components/ui/SectionHeading";
import OrderTimeline from "../components/ui/OrderTimeline";
import { ChipLink } from "../components/ui/Chip";
import ProductCard from "../components/product/ProductCard";
import CategoryCard from "../components/product/CategoryCard";
import { pickBadges } from "../features/catalog/badges";
import { cartStore } from "../features/cart/cartStore";
import { usePageMeta } from "../hooks/usePageMeta";
import { routes } from "../lib/routes";
import {
  colorTokens,
  sampleCategories,
  sampleProducts,
  typeStyles,
} from "./styleguide/samples";
import {
  ButtonStatesDemo,
  CartBadgeDemo,
  ChipDemo,
  FormDemo,
  FreeDeliveryDemo,
  LoadMoreDemo,
  OptionDemo,
  OverlayDemo,
  ToastDemo,
} from "./styleguide/Demos";

const sections = [
  { id: "color", label: "Color" },
  { id: "type", label: "Type" },
  { id: "brand", label: "Logo and devices" },
  { id: "icons", label: "Icons" },
  { id: "buttons", label: "Buttons and links" },
  { id: "forms", label: "Forms" },
  { id: "badges", label: "Badges and prices" },
  { id: "cards", label: "Cards" },
  { id: "options", label: "Variants and chips" },
  { id: "feedback", label: "Messages" },
  { id: "loading", label: "Loading" },
  { id: "overlays", label: "Drawers and sheets" },
  { id: "structure", label: "Headings and lists" },
  { id: "order", label: "Order timeline" },
] as const;

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-sand-line py-12 first:border-t-0 first:pt-0 lg:py-16"
    >
      <h2 id={`${id}-title`} className="type-h2">
        {title}
      </h2>
      {intro && (
        <p className="mt-2 max-w-2xl type-body text-soft-ink">{intro}</p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-10 first:mt-0">
      <h3 className="mb-4 type-label text-soft-ink">{title}</h3>
      {children}
    </div>
  );
}

const icons = [
  { icon: Menu, name: "Menu" },
  { icon: Search, name: "Search" },
  { icon: UserRound, name: "Account" },
  { icon: ShoppingBag, name: "Cart" },
  { icon: House, name: "Home" },
  { icon: Store, name: "Shop" },
  { icon: Heart, name: "Wishlist" },
  { icon: Truck, name: "Delivery" },
  { icon: PackageSearch, name: "Track order" },
  { icon: SlidersHorizontal, name: "Filter" },
  { icon: Clock, name: "Recent" },
  { icon: Gift, name: "Gift" },
  { icon: Lamp, name: "Lighting" },
  { icon: X, name: "Close" },
];

/**
 * The design system on one page: tokens, type, brand devices and every
 * component with its states. Not linked anywhere, not indexed, and left out
 * of production builds (see vite.config.ts).
 */
function StyleguidePage() {
  usePageMeta({ title: "Design system", noindex: true });

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="max-w-3xl">
        <p className="type-eyebrow text-terracotta-deep">Internal reference</p>
        <h1 className="mt-3 type-h1">Dear Corner design system</h1>
        <p className="mt-3 type-body-lg text-soft-ink">
          Every color, type style and component the shop is built from, with
          their states. Brand doc sections 2 to 6, with Rosewood in place of
          Plum Ink. This page isn&rsquo;t part of the live shop.
        </p>
      </header>

      <nav
        aria-label="Sections"
        className="-mx-[var(--gutter)] mt-8 overflow-x-auto px-[var(--gutter)] lg:hidden"
      >
        <ul className="flex gap-2 pb-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex h-10 items-center rounded-full border border-sand-line bg-paper px-4 type-nav whitespace-nowrap hover:border-rosewood hover:text-rosewood"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[200px_1fr] lg:gap-14">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-0.5 border-l border-sand-line">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 type-caption text-soft-ink hover:border-rosewood hover:text-rosewood"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {/* ---------------------------------------------------------- */}
          <Section
            id="color"
            title="Color"
            intro="One dominant neutral, Rosewood as the single strong color, and at most one of Terracotta or Lamp Glow as the highlight. Plum Ink #4A2545 is not used anywhere."
          >
            {colorTokens.map((group) => (
              <Sub key={group.group} title={group.group}>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((c) => (
                    <li
                      key={c.token}
                      className="overflow-hidden rounded-card border border-sand-line bg-paper"
                    >
                      <div
                        className="h-20 border-b border-sand-line"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="p-3">
                        <p className="text-[15px] font-semibold text-ink">
                          {c.name}
                        </p>
                        <p className="type-caption text-soft-ink">
                          {c.hex} · <code className="font-sans">{c.token}</code>
                        </p>
                        <p className="mt-1 type-caption text-soft-ink">
                          {c.note}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Sub>
            ))}
            <Sub title="Rules">
              <ul className="max-w-2xl list-disc space-y-1.5 pl-5 type-body text-ink marker:text-rosewood">
                <li>
                  Never color alone: errors get an icon and a message, sale
                  prices a struck-through old price, links an underline.
                </li>
                <li>
                  Lamp Glow on Rosewood only for text 24px and up, or graphics.
                  Promo text in Lamp Glow sits on Night Plum.
                </li>
                <li>Never Terracotta next to Rosewood.</li>
                <li>
                  Rosewood logo never on Night Plum: use the cream logo there.
                </li>
              </ul>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="type"
            title="Type"
            intro="Fraunces 600 for headlines only, DM Sans for everything else, Hind Siliguri for Bangla and the ৳ sign. Prices use tabular figures."
          >
            <ul className="divide-y divide-sand-line rounded-card border border-sand-line bg-paper">
              {typeStyles.map((t) => (
                <li
                  key={t.className}
                  className="grid gap-2 p-5 md:grid-cols-[220px_1fr] md:gap-6"
                >
                  <div>
                    <p className="font-semibold text-ink">{t.name}</p>
                    <p className="type-caption text-soft-ink">{t.spec}</p>
                  </div>
                  <p className={`${t.className} min-w-0 break-words`}>
                    {t.sample}
                  </p>
                </li>
              ))}
            </ul>
            <Sub title="Bangla">
              <p lang="bn" className="text-[18px] text-ink">
                স্বাগতম · ধন্যবাদ · আপনার অর্ডার পেয়েছি
              </p>
              <p className="mt-1 type-helper">
                Hind Siliguri, line height 1.75, no letter spacing. A native
                speaker approves every Bangla line before launch.
              </p>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="brand"
            title="Logo and devices"
            intro="The supplied logo files only, never retyped. Four quiet graphic devices: the sparkle (one per layout), the leaf sprig, the thin rule and the corner (rounded except a sharp bottom-left), plus a soft lamp glow."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex min-h-36 flex-col justify-between rounded-card border border-sand-line bg-linen p-6">
                <Logo variant="horizontal" height={32} />
                <p className="mt-6 type-caption text-soft-ink">
                  Header, desktop: horizontal, 32px high (186px wide; minimum
                  180)
                </p>
              </div>
              <div className="flex min-h-36 flex-col justify-between rounded-card border border-sand-line bg-linen p-6">
                <Logo variant="compact" height={20} />
                <p className="mt-6 type-caption text-soft-ink">
                  Header, phones: compact wordmark, 20px high (143px; minimum
                  110)
                </p>
              </div>
              <div className="surface-dark flex min-h-36 flex-col justify-between rounded-card bg-night-plum p-6">
                <Logo variant="horizontal-tagline-cream" width={300} />
                <p className="mt-6 type-caption text-linen/75">
                  Footer: cream logo with tagline, 300px (minimum 280)
                </p>
              </div>
              <div className="flex min-h-36 items-end justify-between gap-6 rounded-card border border-sand-line bg-paper p-6">
                <Logo variant="monogram" width={72} />
                <Logo variant="monogram-simple" width={32} />
                <p className="type-caption text-soft-ink">
                  Monogram (48px+) and simplified monogram
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid min-h-40 place-items-center rounded-card border border-sand-line bg-paper p-6">
                <Sparkle size={28} className="text-rosewood" />
                <p className="type-caption text-soft-ink">Sparkle</p>
              </div>
              <div className="grid min-h-40 place-items-center rounded-card border border-sand-line bg-paper p-6">
                <LeafSprig className="h-20 text-rosewood" />
                <p className="type-caption text-soft-ink">Leaf sprig</p>
              </div>
              <div className="grid min-h-40 place-items-center rounded-card border border-sand-line bg-paper p-6">
                <span className="block h-px w-3/4 bg-rosewood" />
                <p className="type-caption text-soft-ink">Thin rule</p>
              </div>
              <div className="relative grid min-h-40 place-items-center overflow-hidden corner-mask bg-clay-blush p-6">
                <span
                  aria-hidden="true"
                  className="absolute -top-12 -right-12 size-48 glow"
                />
                <p className="relative type-caption text-rosewood">
                  Corner mask + glow
                </p>
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="icons"
            title="Icons"
            intro="Lucide outline only, 24px grid, 1.75px stroke at every size, in Ink or Rosewood. Every tappable icon has a 44px touch area and a name for screen readers."
          >
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
              {icons.map(({ icon: Icon, name }) => (
                <li
                  key={name}
                  className="flex flex-col items-center gap-2 rounded-control border border-sand-line bg-paper p-4"
                >
                  <Icon aria-hidden="true" className="text-ink" />
                  <span className="type-caption text-soft-ink">{name}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-1">
              <IconButton label="Search" icon={<Search aria-hidden="true" />} />
              <IconButton
                label="Cart"
                count={3}
                icon={<ShoppingBag aria-hidden="true" />}
              />
              <IconButton
                label="Disabled"
                disabled
                icon={<Heart aria-hidden="true" />}
              />
              <span className="ml-3 type-helper">
                Icon buttons: hover, cart count, disabled
              </span>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="buttons"
            title="Buttons and links"
            intro="48px high (44px in dense areas), 10px radius, sentence case that says what happens. Full width on phone forms."
          >
            <Sub title="Variants">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Add to cart</Button>
                <Button variant="secondary">Order now</Button>
                <Button variant="quiet">Continue shopping</Button>
                <Button disabled>Sold out</Button>
                <Button variant="secondary" disabled>
                  Unavailable
                </Button>
              </div>
            </Sub>
            <Sub title="Sizes and states">
              <div className="flex flex-wrap items-start gap-6">
                <Button size="sm">Small, 44px</Button>
                <Button loading loadingLabel="Saving">
                  Save address
                </Button>
                <ButtonStatesDemo />
              </div>
            </Sub>
            <Sub title="On dark panels">
              <div className="surface-dark flex flex-wrap items-center gap-4 rounded-card bg-night-plum p-6">
                <p className="type-promo text-lamp-glow">
                  Lamps for longer evenings
                </p>
                <ButtonLink to={routes.newArrivals} variant="light">
                  Shop lighting
                </ButtonLink>
              </div>
            </Sub>
            <Sub title="Full width (phone forms)">
              <div className="max-w-sm">
                <Button fullWidth>Place order · ৳2,140</Button>
              </div>
            </Sub>
            <Sub title="Text links">
              <p className="type-body">
                Links are rosewood and always underlined:{" "}
                <a href="#buttons" className="link">
                  View details
                </a>
                ,{" "}
                <a href="#buttons" className="link">
                  Remove
                </a>
                ,{" "}
                <a href="#buttons" className="link">
                  Clear all
                </a>
                . Hover turns them terracotta deep with a thicker line.
              </p>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="forms"
            title="Forms"
            intro="Label above every field, helper text below, 16px text so phones don't zoom. Errors: a 2px border, an icon and words that say what to do."
          >
            <FormDemo />
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="badges"
            title="Badges and prices"
            intro="Badges: 24px, DM Sans 700 12px, with the brand's sharp bottom-left corner. A card shows at most two, in the order Sold out, Sale, New, Low stock, Bestseller, Gift, and never Sale with Bestseller."
          >
            <Sub title="All badges">
              <div className="flex flex-wrap gap-2">
                <Badge kind="new">New</Badge>
                <Badge kind="sale">-23%</Badge>
                <Badge kind="bestseller">Bestseller</Badge>
                <Badge kind="gift">Gift</Badge>
                <Badge kind="low-stock">Only 3 left</Badge>
                <Badge kind="sold-out">Sold out</Badge>
                <Badge kind="free-delivery">Free delivery</Badge>
              </div>
            </Sub>
            <Sub title="Which badges a card gets">
              <ul className="space-y-2">
                {[
                  {
                    label: "On sale, new and a bestseller",
                    p: sampleProducts[0],
                  },
                  {
                    label: "Bestseller and a gift",
                    p: { ...sampleProducts[1], isGift: true },
                  },
                  { label: "Sold out, gift", p: sampleProducts[3] },
                  { label: "On sale, 3 left", p: sampleProducts[2] },
                  {
                    label: "4% off (no sale badge under 5%)",
                    p: {
                      ...sampleProducts[5],
                      onSale: true,
                      discountPercent: 4,
                    },
                  },
                ].map(({ label, p }) => (
                  <li key={label} className="flex flex-wrap items-center gap-3">
                    <span className="w-64 type-caption text-soft-ink">
                      {label}
                    </span>
                    <span className="flex gap-1.5">
                      {pickBadges(p).map((b) => (
                        <Badge key={b.kind} kind={b.kind}>
                          {b.label}
                        </Badge>
                      ))}
                      {pickBadges(p).length === 0 && (
                        <span className="type-caption text-soft-ink">
                          no badge
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Sub>
            <Sub title="Prices">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Price price={1290} />
                  <p className="mt-1 type-helper">Regular (card)</p>
                </div>
                <div>
                  <Price price={990} compareAt={1290} />
                  <p className="mt-1 type-helper">Sale (card)</p>
                </div>
                <div>
                  <Price price={890} from />
                  <p className="mt-1 type-helper">
                    Variants at different prices
                  </p>
                </div>
                <div>
                  <Price price={990} compareAt={1290} size="page" />
                  <p className="mt-1 type-helper">Product page</p>
                </div>
              </div>
            </Sub>
            <Sub title="Rating (only with real, approved reviews)">
              <Rating value={4.7} count={18} />
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="cards"
            title="Cards"
            intro="Product cards: 1:1 photo, 16px radius, two-line title, price, up to four swatches. The whole card is one link. With a mouse, hovering shows the second photo and a quick add (or Select options). Sample cards have no photos yet, so the placeholder shows."
          >
            <Sub title="Product cards">
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {sampleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickAdd={async (p) => {
                      await new Promise((r) => window.setTimeout(r, 500));
                      cartStore.add(p.defaultVariantId ?? "styleguide-sample");
                    }}
                  />
                ))}
              </div>
            </Sub>
            <Sub title="Category cards">
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
                {sampleCategories.map((category) => (
                  <CategoryCard key={category.slug} category={category} />
                ))}
              </div>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="options"
            title="Variants and chips"
            intro="Color swatches 36px, size buttons at least 44px. Sold-out choices are crossed out and named in words. Chips are full pills."
          >
            <OptionDemo />
            <Sub title="Sub-category chips">
              <div className="flex flex-wrap gap-2">
                <ChipLink to={routes.styleguide}>All lighting</ChipLink>
                <ChipLink to={routes.category("table-lamps")}>
                  Table lamps
                </ChipLink>
                <ChipLink to={routes.category("fairy-lights")}>
                  Fairy lights
                </ChipLink>
              </div>
            </Sub>
            <Sub title="Toggles and applied filters">
              <ChipDemo />
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="feedback"
            title="Messages"
            intro="Say what happened and what to do, next to the problem. Toasts confirm saved changes: bottom-center on phones, top-right on desktop, for 4 seconds."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Notice tone="success" title="Address saved">
                We&rsquo;ll use it for your next order.
              </Notice>
              <Notice tone="warning" title="Only 2 left">
                Order soon if you&rsquo;d like this one.
              </Notice>
              <Notice tone="error">{errorCopy.coupon}</Notice>
              <Notice tone="info">{errorCopy.orderLookup}</Notice>
            </div>
            <Sub title="Toasts">
              <ToastDemo />
            </Sub>
            <Sub title="Empty states">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-card border border-sand-line bg-paper">
                  <EmptyState
                    headingLevel={3}
                    title={emptyCopy.cart.title}
                    action={
                      <ButtonLink to={routes.newArrivals}>
                        {emptyCopy.cart.action}
                      </ButtonLink>
                    }
                    icon={<ShoppingBag size={36} aria-hidden="true" />}
                  />
                </div>
                <div className="rounded-card border border-sand-line bg-paper">
                  <EmptyState
                    headingLevel={3}
                    title={emptyCopy.search("lamp xyz").title}
                  >
                    {emptyCopy.search("lamp xyz").body}
                  </EmptyState>
                </div>
                <div className="rounded-card border border-sand-line bg-paper">
                  <EmptyState
                    headingLevel={3}
                    title={emptyCopy.orders.title}
                    icon={<PackageSearch size={36} aria-hidden="true" />}
                  >
                    {emptyCopy.orders.body}
                  </EmptyState>
                </div>
              </div>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="loading"
            title="Loading"
            intro="Never a blank screen. Pages: the pulsing lamp-glow dot. Grids: skeleton cards in the card's exact shape. Buttons: an inline spinner."
          >
            <div className="flex flex-wrap items-center gap-10">
              <div className="flex items-center gap-3">
                <span className="block size-3 animate-glow-pulse rounded-full bg-lamp-glow" />
                <span className="type-caption text-soft-ink">Page loader</span>
              </div>
              <div className="flex items-center gap-3 text-rosewood">
                <Spinner />
                <span className="type-caption text-soft-ink">Spinner</span>
              </div>
              <div className="flex w-48 flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <Sub title="Skeleton grid">
              <ProductGridSkeleton count={4} />
            </Sub>
            <Sub title="Load more (instead of endless scrolling)">
              <LoadMoreDemo />
            </Sub>
            <Sub title="Free-delivery progress">
              <FreeDeliveryDemo />
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="overlays"
            title="Drawers and sheets"
            intro="Native dialogs: focus stays inside, Esc and the backdrop close them, focus returns to the button, the page behind doesn't scroll or shift. The menu and search open from the header."
          >
            <OverlayDemo />
            <Sub title="Header cart badge">
              <CartBadgeDemo />
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="structure" title="Headings and lists">
            <SectionHeading
              eyebrow="New arrivals"
              sparkle
              title="New this week"
              description="Lamps, desk picks and gifts from ৳290."
              link={{ to: routes.newArrivals, label: "View all" }}
            />
            <Sub title="Breadcrumbs">
              <Breadcrumbs
                items={[
                  { label: "Home", to: routes.home },
                  { label: "Lighting", to: routes.category("lighting") },
                  { label: "Pleated table lamp" },
                ]}
              />
            </Sub>
            <Sub title="Accordions">
              <div className="max-w-2xl">
                <Accordion name="sg-faq" title="Description" defaultOpen>
                  <p className="type-body text-soft-ink">
                    A pleated shade with a warm, soft glow for a bedside table
                    or desk.
                  </p>
                </Accordion>
                <Accordion name="sg-faq" title="Details and care">
                  <p className="type-body text-soft-ink">
                    Wipe with a soft, dry cloth.
                  </p>
                </Accordion>
                <Accordion name="sg-faq" title="Delivery and Cash on Delivery">
                  <p className="type-body text-soft-ink">
                    Inside Dhaka in 2–3 days, outside Dhaka in 3–5 days. Pay the
                    rider when it arrives.
                  </p>
                </Accordion>
              </div>
            </Sub>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            id="order"
            title="Order timeline"
            intro="Done steps in Rosewood with a check. The current step has a Lamp Glow ring with an Ink outline and a “Now” label, so it never relies on color alone."
          >
            <div className="grid gap-10 md:grid-cols-2">
              <OrderTimeline
                steps={[
                  {
                    label: "Placed",
                    done: true,
                    current: false,
                    at: "2026-10-20T08:12:00Z",
                  },
                  {
                    label: "Confirmed",
                    done: true,
                    current: false,
                    at: "2026-10-20T10:40:00Z",
                  },
                  {
                    label: "Packed",
                    done: true,
                    current: true,
                    at: "2026-10-21T05:05:00Z",
                  },
                  { label: "Handed to courier", done: false, current: false },
                  { label: "Out for delivery", done: false, current: false },
                  { label: "Delivered", done: false, current: false },
                ]}
              />
              <OrderTimeline
                steps={[
                  {
                    label: "Placed",
                    done: true,
                    current: false,
                    at: "2026-10-20T08:12:00Z",
                  },
                  { label: "Confirmed", done: false, current: false },
                  { label: "Packed", done: false, current: false },
                  { label: "Handed to courier", done: false, current: false },
                  { label: "Out for delivery", done: false, current: false },
                  { label: "Delivered", done: false, current: false },
                ]}
                closed={{
                  status: "cancelled",
                  label: "Cancelled",
                  at: "2026-10-20T11:00:00Z",
                  note: "Cancelled on the confirmation call, at the customer's request.",
                }}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default StyleguidePage;
