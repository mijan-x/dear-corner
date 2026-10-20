import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import PageLoader from "../components/system/PageLoader";

/** Wraps every page: skip link, lazy-page fallback and scroll restoration. */
function RootLayout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-rosewood px-4 py-3 type-button text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  );
}

export default RootLayout;
