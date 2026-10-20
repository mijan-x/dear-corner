import Logo, { HeaderLogo } from "../components/brand/Logo";
import LeafSprig from "../components/brand/LeafSprig";
import Sparkle from "../components/brand/Sparkle";
import { usePageMeta } from "../hooks/usePageMeta";

/**
 * Phase A holding page. Replaced by the full homepage in Phase D.
 */
function HomePage() {
  usePageMeta({});

  return (
    <div className="flex min-h-dvh flex-col bg-linen">
      <header className="border-b border-sand-line bg-linen">
        <div className="container-page flex h-14 items-center justify-center lg:h-[72px] lg:justify-start">
          <a href="/" className="inline-flex items-center rounded-control py-2">
            <HeaderLogo />
          </a>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center">
        <section className="container-page grid items-center gap-12 section-y lg:grid-cols-12">
          <div className="max-w-2xl lg:col-span-6">
            <p
              className="flex animate-fade-up items-center gap-2 type-eyebrow text-terracotta-deep"
              style={{ animationDelay: "60ms" }}
            >
              <Sparkle size={12} className="text-rosewood" />
              Opening soon
            </p>
            <h1
              className="mt-4 animate-fade-up type-hero"
              style={{ animationDelay: "140ms" }}
            >
              Little things for <em className="italic">quiet</em> corners
            </h1>
            <p
              className="mt-5 max-w-xl animate-fade-up type-body-lg text-soft-ink"
              style={{ animationDelay: "220ms" }}
            >
              Room decor, lamps, desk picks and gifts, chosen for how they look
              in a real room. We&rsquo;re arranging the shelves now.
            </p>
          </div>

          {/* Quiet composition: clay-blush panel with the corner mask, a lamp
              glow and the leaf sprig. Decorative only. */}
          <div
            aria-hidden="true"
            className="relative hidden animate-fade-in lg:col-span-5 lg:col-start-8 lg:block"
            style={{ animationDelay: "300ms" }}
          >
            <div className="relative aspect-[4/5] overflow-hidden corner-mask-lg bg-clay-blush">
              <div className="absolute -top-16 -right-16 size-[420px] glow" />
              <LeafSprig className="absolute bottom-[14%] left-1/2 h-[58%] -translate-x-1/2 text-rosewood" />
              <div className="absolute inset-x-10 bottom-10 h-px bg-rosewood/40" />
            </div>
          </div>
        </section>
      </main>

      <footer className="surface-dark bg-night-plum text-linen">
        <div className="container-page flex flex-col items-start gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <Logo variant="horizontal-tagline-cream" width={300} />
          <p className="type-caption text-linen/80">
            &copy; {new Date().getFullYear()} Dear Corner. Cash on Delivery
            across Bangladesh.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
