# Dear Corner — Project State

Online shop for aesthetic room decor, lamps and lighting, desk and stationery,
accessories and gifts in Bangladesh. Tagline: **Little Things, Lovely Spaces.**

Stack: Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4 + React Router 7 +
Supabase, deployed on Vercel from GitHub (`mijan-x/dear-corner`, branch `main`).
Reference project (read-only, never changed): `mijan-x/blyver`.

Last updated: 2026-10-21 (end of Phase D).

## Environments

| What              | Value                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Supabase project  | `Dear-Corner-SG`, ref `elyntthbaoczxgjeadft`, region Singapore (ap-southeast-1)                 |
| Supabase URL      | https://elyntthbaoczxgjeadft.supabase.co                                                        |
| Old project       | `Dear-Corner` in Seoul (`jzqfjnppeojlekprgjww`), empty — owner to delete                        |
| Vercel project    | `dear-corner` (`prj_tdMnAqIX9IEHwihSzyqaPkoesB2x`), account dearcorner.bd@gmail.com, Hobby plan |
| Production URL    | https://dear-corner-beta.vercel.app                                                             |
| Vercel protection | Vercel login required on preview deployments only; production is public                         |
| Admin email       | dearcorner.bd@gmail.com                                                                         |

## Environment variables

| Name                     | Where                             | Notes                                                                               |
| ------------------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Vercel (set, Production), CI vars | Project URL above                                                                   |
| `VITE_SUPABASE_ANON_KEY` | Vercel (set, Production), CI vars | Publishable key (`sb_publishable_…`). Public by design; RLS protects data           |
| `VITE_SITE_URL`          | Vercel (set, Production)          | Absolute URL used in Open Graph tags. Default `https://dear-corner-beta.vercel.app` |

Never commit real values. `.env.example` lists them. Without the Supabase
values the site still loads; data calls reject with `SupabaseNotConfiguredError` and the header,
menu and footer fall back to built-in defaults. Vercel's build-time `VERCEL_ENV` decides whether
`/styleguide` is included (left out when it is `production`).

## Folder map

```
.github/workflows/ci.yml  CI: install, format check, lint, build, screenshots (see "CI" below)
index.html                App shell: title, meta, Open Graph, favicons, manifest
vercel.json               SPA rewrite to /index.html, cache + security headers
public/                   favicon set, app icons, site.webmanifest, og-image.png, robots.txt
  samples/                Demo photos (WebP): products/, categories/, home/. Replace before launch
scripts/
  screenshots.mjs         Playwright: screenshots at 360/768/1280 (pages and opened menus/dialogs),
                          console/overflow report, axe accessibility scan when axe-core is installed
  screenshot-routes.json  Routes, viewports and the clicks/hovers that reach each state
  supabase-mock.mjs       Answers the shop's Supabase requests from the local test database
                          (CI screenshots show the sample products)
  build-sql-bundle.sh     Rebuilds the supabase/manual/ files (CI checks them)
  sample-photos/          build.py (Canva originals → WebP at size budgets), export-links.json
  make-figures-font.py    Builds the "DC Figures" tabular-digit font from DM Sans
src/
  main.tsx                Entry: fonts, CSS, error boundary, Lucide defaults (1.75 stroke), router
  router.tsx              Routes inside RootLayout > ShopLayout. Home eager; every other page lazy
  index.css               Tailwind v4 @theme tokens, base styles, type scale, graphic devices
  styles/fonts.css        @font-face rules (Fraunces, DM Sans, Hind Siliguri, DC Taka, DC Figures)
  assets/brand/           Logo SVGs from dear-corner-logos-dc.zip (never retyped)
  assets/fonts/           DC Figures (tabular digits) + font licences
  components/brand/       Logo, HeaderLogo, Sparkle, LeafSprig
  components/system/      PageLoader (lamp-glow dot), ErrorBoundary, RouteError
  components/ui/          Button/ButtonLink, IconButton/IconLink, Field (text, phone +880, select,
                          textarea), Choice (checkbox, radio card), QuantityStepper, OptionPicker,
                          Chip, Badge, Price, Rating, Notice, EmptyState (+ copy), Skeleton,
                          Accordion, Breadcrumbs, SectionHeading, LoadMore, FreeDeliveryProgress,
                          OrderTimeline, Dialog (drawer/sheet/cart/modal/search), Toast, Spinner
  components/product/     ProductCard, CategoryCard, ProductRow (snap row + arrows), ProductGallery,
                          DeliveryInfo
  components/home/        Hero, PromoBanner, PromiseStrip, HomeReviews, InstagramGrid
  components/listing/     ListingHeader, FilterPanel, ListingToolbar (sort select, phone Filter/Sort
                          sheets), AppliedFilters, ProductResults (pages + Load more), SearchForm
  components/motion/      Reveal (fade-up once in view, one shared IntersectionObserver)
  components/layout/      AnnouncementBar, SiteHeader, DesktopNav (+ Shop panel), MenuDrawer,
                          SearchDialog, SiteFooter, NewsletterForm, BottomNav
  features/cart/          cartStore (guest cart in localStorage, count for badges), useAddToCart
  features/catalog/       badges.ts (which badges a card shows), listingState.ts (filters/sort in the
                          URL), variants.ts (selection, availability, price, gallery per color)
  features/search/        recentSearches (last 5, this browser only)
  features/auth/          (Phase E) auth provider, guards
  hooks/                  usePageMeta, useDebouncedValue, useRowScroll
  layouts/                RootLayout (skip link, toasts, scroll restoration), ShopLayout (chrome)
  lib/                    env, supabase (loaded on first use), routes (URL map), query (shared cache),
                          store (localStorage store), storage, errors (shopper messages), images
  pages/                  HomePage, ListingPage (Shop all, category, collection, search),
                          ProductPage, NotFoundPage, StyleguidePage (+ styleguide/ samples and demos)
  services/               settings, catalog (menu, search suggestions), home (feed + homepage
                          content), listing, product, shipping, newsletter
  types/database.ts       Generated from the live database (regenerate after every migration)
  data/bd-geo.json        8 divisions / 64 districts / 612 areas for the address dropdowns
  types/shop.ts           Storefront shapes (product card, nav) mapped from the database JSON
  utils/                  formatPrice (৳1,290), discountPercent, formatDate (Asia/Dhaka), cx,
                          emphasis (*word* → italics in admin-editable titles)
supabase/
  README.md               What each migration does, rules the database enforces, how to make an admin
  migrations/             SQL migrations, applied in file-name order
  manual/                 One-paste SQL bundles for the dashboard SQL editor
  seeds/                  12 [SAMPLE] products, their demo photos, and the removal script
  tests/                  SQL + concurrency tests (run_local.sh builds a throwaway PostgreSQL)
  local/                  Supabase stand-in (roles, auth.users, storage) for the local tests
scripts/build-geo-data.py Builds src/data/bd-geo.json and the geo seed from nuhil/bangladesh-geocode (MIT)
```

## Phase checklist

- [x] **Phase A — Setup** (branch `phase-a-setup`)
  - [x] Toolchain: Vite, React 19, TypeScript, Tailwind v4, React Router 7, ESLint, Prettier (+ Tailwind class sorting)
  - [x] Brand tokens in `@theme` (Rosewood primary; Tailwind's default palette removed)
  - [x] Fonts self-hosted, Latin + Bengali subsets, `font-display: swap`, DM Sans 400 preloaded
  - [x] Logos in `src/assets/brand/`, rendered at real size and checked: the C knock-out mask shows in Chromium (header 186×32, mobile 143×20, footer 300×63)
  - [x] Favicons, Apple touch icon, web manifest (192, 512, maskable 512), Open Graph image 1200×630
  - [x] `.env.example`, `vercel.json`, title, meta and Open Graph tags
  - [x] Route shell with lazy routes and the lamp-glow loader, 404 page
  - [x] Vercel project created and linked to the repo
  - [x] Build, lint and format pass; screenshots at 360/768/1280
- [x] **Phase B — Database** (branch `phase-b-database`, PR #2)
  - [x] Schema: catalog (categories, collections, products, options, one variant per SKU, images), customers
        (addresses, cart, wishlist, newsletter, contact), orders (snapshots, history, notes), coupons, reviews
  - [x] Row Level Security on every table; no public read on orders; admin = admin role **and** two-step login (aal2)
  - [x] Server-side pricing (`price_cart`) shared by `quote_cart` and `place_order`; stock per SKU taken with row
        locks in a fixed order; order numbers DC-10001…; Track order by number + phone; reviews only after delivery
  - [x] Delivery zones (Inside Dhaka ৳80 2–3 days, Outside Dhaka ৳130 3–5 days, free from ৳1,000) and 612 BD areas
  - [x] Storage buckets `product-images`, `site-media` (public read, admin-only write)
  - [x] Foreign-key indexes; one policy per table/role/action (advisor clean-up)
  - [x] 149 database checks (access, policies, pricing, orders, stock races) pass locally and in CI
  - [x] All 12 migrations and the 12 sample products applied to Dear-Corner-SG (the last three pasted by the owner
        from `supabase/manual/finish-phase-b.sql`). Verified identical to the tested copy: function, permission,
        policy, table and trigger fingerprints match
  - [x] Supabase advisors: security lists only the intended public RPCs and the admin RPCs (each checks
        `is_admin()` inside); performance lists only "unused index" notices (no traffic yet)
  - [x] `src/types/database.ts` regenerated from the live database
- [x] **Phase C — Design system and layout** (branch `phase-c-design-system`)
  - [x] Chrome: announcement bar (from store settings), sticky header (72px, 60px once stuck, without moving
        the page), full navigation from 1280px with the Shop panel (6 categories + one image), menu drawer below
        1280px, search overlay (5 products, 3 categories, recent searches, popular categories), Night Plum footer
        (cream logo 300px, collapsible on phones, newsletter sign-up), bottom navigation on phones (hidden on
        product, cart and checkout)
  - [x] Components (see folder map) with every state: hover, focus, disabled, loading, success, error
  - [x] Native `<dialog>` overlays: focus trap, Esc, backdrop, focus return, no scroll or layout shift
  - [x] `/styleguide` with tokens, type, logo and devices, icons and all components; not in production builds
  - [x] Supabase library split out of the first download (loaded on first data call)
  - [x] 31 scripted interaction checks; screenshots at 360/768/1280 including open menu, search, Shop panel,
        stuck header and cart drawer; axe accessibility scan in CI
- [x] **Phase D — Shop** (branch `phase-d-shop`)
  - [x] 31 demo photos generated in Canva (design "Dear Corner demo photos", DAHYk4iBZN8): 12 products,
        6 color variants, 3 lifestyle shots, hero (desktop + phone), 2 banners, 6 category images. No text,
        brand palette, few props. Originals on the `sample-photos-src` branch; WebP built by
        `scripts/sample-photos/build.py` (hero 47 + 38 KB, product photos 30–123 KB, 1200 + 400 px)
  - [x] Photos linked in the database by `supabase/seeds/sample_products_images.sql` (each color has its
        photos; each color variant its main photo). Live: the owner pastes
        `supabase/manual/phase-d-demo-photos.sql` (the connector's write was cancelled)
  - [x] Home: split hero (`<picture>`, high priority, preloaded from index.html), 6 category cards, New
        arrivals row (2.3 cards on phones), two promo banners, Best sellers, promises strip; reviews and
        Instagram hidden until real ones exist
  - [x] Shop all, category (banner 4:1 / 2:1, sub-category chips), collection and search on one listing
        page: filters (category, price presets + min/max, color, in stock, on sale) with counts, five
        sorts (+ Best match for search), Load more 24 at a time, all kept in the URL; phone Filter/Sort
        bottom sheets under a sticky bar; removable filter chips
  - [x] Product page: gallery (swipe + dots on phones; 72px thumbnails + hover zoom on desktop), color
        switch swaps photos with a 200ms fade, sold-out options crossed out and named, "From ৳520" until
        a size is chosen, stock line, quantity capped by stock, Add to cart (toast + badge), Order now,
        delivery/COD/at-the-door info, accordions, You may also like, phone 72px bar; variant in the URL
  - [x] 50 scripted interaction checks pass; screenshots at 360/768/1280 with shop data from the local
        test database (also in CI now)
- [ ] **Phase E — Cart, checkout, account**: cart, checkout, confirmation, track order, auth, account
- [ ] **Phase F — Admin**
- [ ] **Phase G — Content and polish**: About, Contact, FAQ, policies, performance and accessibility passes

## Design tokens (summary — full list in `src/index.css`)

- Brand: rosewood `#784B4E` (hover `#5E373C`, pressed `#4A2B2F`), terracotta `#B04A3A`,
  terracotta-deep `#9A3E30`, lamp-glow `#F6BE4B`, clay-blush `#F5DDD5`
- Neutrals: linen `#FBF7F1` (page), paper `#FFFFFF`, night-plum `#1F1220`, ink `#241B22`,
  soft-ink `#6A5C66`, sand-line `#E6DDD3`, soft-sand `#EFE7DD`, mauve-grey `#857884`,
  image-placeholder `#F3ECE3`, cream `#FBF3EC` (logo)
- Status: success `#2F6B4F`/`#E3EEE6`, warning `#6B4700`/`#FFF1CF`, error `#B3261E`/`#FBE3E0`, info `#2D5E8A`/`#E2EDF6`
- Radius: badge 6, control 10, card 16, sheet 24. Shadows: `hover`, `drawer`. Motion 150–200ms ease-out
- Type utilities: `type-hero`, `type-h1`, `type-h2`, `type-h3`, `type-promo`, `type-body`, `type-body-lg`,
  `type-caption`, `type-eyebrow`, `type-label`, `type-helper`, `type-nav`, `type-button`, `type-badge`,
  `type-card-title`, `type-product-title`, `type-price`, `type-price-card`, `type-price-old`, `figures`
- Devices: `corner-mask` (sharp bottom-left), `glow`, `skeleton`, `link`, `container-page`, `section-y`
- Plum Ink `#4A2545` is not used anywhere.

Tabular figures (`figures`, DC Figures) only for prices and quantities; running text keeps DM Sans'
proportional digits ("Add ৳710 more", "-17%").

Contrast rules: lamp-glow on rosewood (4.25:1) only for text 24px+ or graphics; promo banners with
lamp-glow text use night-plum (10.6:1). Never terracotta next to rosewood. Rosewood logo never on
night-plum (use cream).

## Decisions (owner, 20 Oct 2026)

- Six category cards: Room decor, Lighting, Desk and stationery, Accessories, Gifts, New arrivals.
- Delivery: Inside Dhaka = Dhaka city (both city corporations) ৳80, 2–3 days. Outside Dhaka
  (everything else, including Savar and Keraniganj) ৳130, 3–5 days. Free when the subtotal after
  coupon is ৳1,000 or more. Editable in admin.
- Cash on Delivery; every order is confirmed by phone (Placed → call → Confirmed). Placement message:
  "Thank you, Rima! We've got your order #DC-10482. We'll call you soon to confirm it."
  Max 3 open orders per phone. Order numbers from DC-10001.
- Returns: customer checks the parcel at the door; if not wanted, hands it back to the rider and pays
  only the delivery charge. No returns or exchanges after the rider leaves.
- Customer email via Gmail SMTP (app password) from dearcorner.bd@gmail.com.
- Wishlist yes, newsletter sign-up yes (collect only), admin activity log yes, CSV import no.
- Reviews: signed-in and guest buyers after delivery (guests via Track order); moderated.
- Hero: split layout. Demo images generated from the owner's reference photo, replaced before launch.
- Homepage: reviews hidden until one is approved; Instagram hidden until 6 photos; banners only with an image.
- 12 sample products marked [SAMPLE], removable in one click.
- Badge order: Sold out, Sale, New, Low stock, Bestseller, Gift; max 2; never Sale + Bestseller together.
- Full desktop nav from 1280px (menu drawer below). Bottom nav hidden on product, cart, checkout.

## Storefront conventions (Phase C)

- URLs (`src/lib/routes.ts`): `/shop`, `/shop/<category-or-sub-category>`, `/collections/<slug>`,
  `/products/<slug>`, `/search?q=`, `/cart`, `/checkout`, `/track-order`, `/account`, `/account/sign-in`,
  `/account/wishlist`, `/about`, `/contact`, `/faq`, `/delivery`, `/exchange-and-returns`, `/privacy`,
  `/terms`. Links to pages not built yet show the 404 page until their phase.
- Header icons: search and cart everywhere, account from 768px (phones use the bottom navigation).
- Listing URLs: `?sort=&min=&max=&color=…&stock=1&sale=1&cat=&q=&page=` (defaults left out). Filters
  push a history entry (Back undoes them); Load more replaces it.
- Product URLs carry the chosen variant: `/products/<slug>?variant=<id>`.
- Homepage text, photos and banners come from `store_settings.homepage` (shape in `services/home.ts`);
  missing fields use the built-in defaults. In titles, `*word*` is shown in italics.
- Motion: `Reveal` fades sections up once (opacity/transform only); the hero photo never animates
  (Largest Contentful Paint). Everything is static with reduced motion.
- Shop data is read through `useQuery` (shared, cached, refreshed in the background); settings and the
  menu are also kept in localStorage so returning visitors see them instantly.
- Errors shown to shoppers go through `toShopError()`; empty-state and error copy is word for word from
  the brand doc (`components/ui/emptyStateCopy.ts`).
- The sparkle appears once per layout; the corner (sharp bottom-left) is on badges, the hero panel and
  the Shop panel image.

## Database (summary — details in `supabase/README.md`)

- Money is whole taka (`integer`). The browser never sends prices.
- Shopper errors carry a friendly message and a `DC_…` code in `DETAIL`.
- Abuse limits: 3 open orders per phone, 10 orders / 10 min per connection, 20 lookups / 10 min,
  5 contact messages / hour, 30 failed coupon codes / hour.
- Supabase's "anyone can call any function" default is switched off (`…120900_grants`); every new
  function needs an explicit `grant execute`.
- Sample data: 12 `[SAMPLE]` products (SKUs `SAMPLE-…`), removable with the admin button or
  `supabase/seeds/delete_sample_products.sql`.

## Open decisions / [TO CONFIRM]

- Fault found after delivery (for example a lamp that won't light): what happens?
- Is the delivery charge waived when the item is wrong or damaged at the door?
- Contact phone, email, address, opening hours, reply time, social links (owner will send).
- Native Bangla speaker to approve every Bangla line before launch.
- Vercel Hobby is non-commercial only; move to Pro before taking real orders.

## CI and local tooling

The authoring workspace cannot reach the npm registry, so GitHub Actions does the installing:

- Every push runs `.github/workflows/ci.yml`: `npm ci` (or `npm install` and commits an updated
  `package-lock.json`), Prettier check, ESLint, `tsc -b && vite build`, then Playwright screenshots.
- Logs and screenshots are published to the `ci-results` branch under `<branch-name>/`.
- A copy of `node_modules` (same OS/arch as the workspace) is published to the `ci-node-modules`
  branch whenever the lockfile changes, so builds, lint and screenshots also run locally.
- Both side branches are force-pushed single commits; they can be deleted at the end of the project.
- CI also runs the database tests: `supabase/tests/run_local.sh --seed --test` on the runner's PostgreSQL.
- CI screenshots: a second, fresh local database (migrations + sample seed, no tests) answers the shop's
  Supabase requests (`scripts/supabase-mock.mjs`), so every page shows the sample products and photos.
  Locally: `RUN_AS=claude supabase/tests/run_local.sh --seed --test` (initdb refuses to run as root).

## Known issues

- DM Sans has no tabular-figure feature, so prices use "DC Figures", DM Sans digits re-spaced to one
  width (`scripts/make-figures-font.py`). Every other character in a price still comes from DM Sans.
- The ৳ sign isn't in DM Sans or Fraunces; it comes from "DC Taka", a 1 KB Hind Siliguri subset inlined
  in `fonts.css`, so pages with prices don't download the full Bengali font.
- Logo files are a recreation (see the logo README): a small spur at the top of the sprig stem in the
  monogram is worth a designer's review.
- GitHub Actions variables can't be set (or read) from the authoring workspace. Until the owner adds
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository variables, CI screenshots show pages
  with the built-in fallback menu.
- The authoring workspace can't reach Supabase over HTTPS (only through the Supabase connector). Live-data
  screenshots are made by serving responses captured through the connector to a local build.
- The default announcement text wraps to two lines on 360px phones. A shorter line in admin Settings
  (for example "Cash on Delivery · Free delivery over ৳1,000") keeps it to one.
- Vercel environment variables are set for Production only; preview builds (PR links) have no database
  until they are also enabled for Preview.
- Demo photos are generated (Canva): replace them before launch. Category photos and the 4:1 desktop
  banners are crops of 2:1 images, so a few subjects sit close to the strip's edge.
- "Order now" goes to `/checkout`, which is built in Phase E (404 until then).
- The Supabase connector cancelled the Phase D photo SQL; until the owner pastes
  `supabase/manual/phase-d-demo-photos.sql`, live product and category cards show the leaf placeholder.
- The Supabase connector asks for a confirmation before some migrations (the admin functions, grants and
  policy changes). If nobody confirms, it reports "cancelled" and nothing is applied; those parts can be
  pasted into the SQL editor instead (`supabase/manual/`).
- Migration versions in Supabase's history are the times they were applied (for example
  `20261020173115_foundation`), not the file names; the names match.
