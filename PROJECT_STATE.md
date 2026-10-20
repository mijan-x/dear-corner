# Dear Corner — Project State

Online shop for aesthetic room decor, lamps and lighting, desk and stationery,
accessories and gifts in Bangladesh. Tagline: **Little Things, Lovely Spaces.**

Stack: Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4 + React Router 7 +
Supabase, deployed on Vercel from GitHub (`mijan-x/dear-corner`, branch `main`).
Reference project (read-only, never changed): `mijan-x/blyver`.

Last updated: 2026-10-20 (end of Phase A).

## Environments

| What              | Value                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Supabase project  | `Dear-Corner-SG`, ref `elyntthbaoczxgjeadft`, region Singapore (ap-southeast-1)                 |
| Supabase URL      | https://elyntthbaoczxgjeadft.supabase.co                                                        |
| Old project       | `Dear-Corner` in Seoul (`jzqfjnppeojlekprgjww`), empty — owner to delete                        |
| Vercel project    | `dear-corner` (`prj_tdMnAqIX9IEHwihSzyqaPkoesB2x`), account dearcorner.bd@gmail.com, Hobby plan |
| Vercel protection | Vercel login required on preview deployments only; production is public                         |
| Admin email       | dearcorner.bd@gmail.com                                                                         |

## Environment variables

| Name                     | Where                        | Notes                                                                             |
| ------------------------ | ---------------------------- | --------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Vercel (owner adds), CI vars | Project URL above                                                                 |
| `VITE_SUPABASE_ANON_KEY` | Vercel (owner adds), CI vars | Anon or publishable key (`sb_publishable_…`). Public by design; RLS protects data |
| `VITE_SITE_URL`          | optional                     | Absolute URL used in Open Graph tags. Default `https://dear-corner.vercel.app`    |

Never commit real values. `.env.example` lists them. Without the Supabase
values the site still loads; data calls throw `SupabaseNotConfiguredError`.

## Folder map

```
.github/workflows/ci.yml  CI: install, format check, lint, build, screenshots (see "CI" below)
index.html                App shell: title, meta, Open Graph, favicons, manifest
vercel.json               SPA rewrite to /index.html, cache + security headers
public/                   favicon set, app icons, site.webmanifest, og-image.png, robots.txt
scripts/
  screenshots.mjs         Playwright: full-page screenshots at 360/768/1280 + console/overflow report
  screenshot-routes.json  Routes and viewports to capture
  make-figures-font.py    Builds the "DC Figures" tabular-digit font from DM Sans
src/
  main.tsx                Entry: fonts, CSS, error boundary, router
  router.tsx              Routes. Home eager; every other page lazy-loaded
  index.css               Tailwind v4 @theme tokens, base styles, type scale, graphic devices
  styles/fonts.css        @font-face rules (Fraunces, DM Sans, Hind Siliguri, DC Taka, DC Figures)
  assets/brand/           Logo SVGs from dear-corner-logos-dc.zip (never retyped)
  assets/fonts/           DC Figures (tabular digits) + font licences
  components/brand/       Logo, HeaderLogo, Sparkle, LeafSprig
  components/system/      PageLoader (lamp-glow dot), ErrorBoundary, RouteError
  components/ui/          (Phase C) buttons, inputs, badges, cards…
  components/layout/      (Phase C) announcement bar, headers, footer, drawers
  features/auth/          (Phase E) auth provider, guards
  hooks/                  usePageMeta
  layouts/                RootLayout (skip link, Suspense loader, scroll restoration)
  lib/                    env, Supabase client
  pages/                  HomePage (holding page until Phase D), NotFoundPage
  services/               (Phase B+) Supabase data access
  types/                  (Phase B+) shared types
  utils/                  formatPrice (৳1,290), discountPercent, cx
supabase/migrations/      (Phase B) SQL migrations
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
- [ ] **Phase B — Database**: migrations, RLS, admin role + MFA, RPCs, storage, zones, BD geo data, sample products
- [ ] **Phase C — Design system and layout**: chrome, components, `/styleguide`
- [ ] **Phase D — Shop**: demo images, Home, Shop all, category/collection, product, search
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

## Known issues

- DM Sans has no tabular-figure feature, so prices use "DC Figures", DM Sans digits re-spaced to one
  width (`scripts/make-figures-font.py`). Every other character in a price still comes from DM Sans.
- The ৳ sign isn't in DM Sans or Fraunces; it comes from "DC Taka", a 1 KB Hind Siliguri subset inlined
  in `fonts.css`, so pages with prices don't download the full Bengali font.
- Logo files are a recreation (see the logo README): a small spur at the top of the sprig stem in the
  monogram is worth a designer's review.
- GitHub Actions variables can't be set from the authoring workspace. Until the owner adds
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository variables, CI screenshots show pages
  without live data.
