import { Link } from "react-router";
import Logo from "../components/brand/Logo";
import { usePageMeta } from "../hooks/usePageMeta";

/** 404. Copy from brand doc section 6 ("Page not found"). */
function NotFoundPage() {
  usePageMeta({ title: "Page not found", noindex: true });

  return (
    <main
      id="main"
      className="grid min-h-dvh place-items-center bg-linen px-4 py-16 text-center text-ink"
    >
      <div className="flex max-w-md flex-col items-center">
        <Logo variant="monogram" width={72} decorative />
        <h1 className="mt-8 type-h1">This corner is empty.</h1>
        <p className="mt-3 type-body-lg text-soft-ink">
          Let&rsquo;s get you back to the shop.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-12 items-center rounded-control bg-rosewood px-6 type-button text-white transition-colors hover:bg-rosewood-hover active:bg-rosewood-pressed"
        >
          Back to the shop
        </Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
