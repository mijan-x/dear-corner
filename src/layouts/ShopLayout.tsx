import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import AnnouncementBar from "../components/layout/AnnouncementBar";
import SiteHeader from "../components/layout/SiteHeader";
import SiteFooter from "../components/layout/SiteFooter";
import BottomNav from "../components/layout/BottomNav";
import PageLoader from "../components/system/PageLoader";
import { hidesBottomNav } from "../lib/routes";
import { cx } from "../utils/cx";

/**
 * The storefront frame: announcement bar, sticky header, page, footer and,
 * on phones, the bottom navigation. Pages load inside it, so the header and
 * footer stay put while the lamp-glow loader shows.
 */
function ShopLayout() {
  const { pathname } = useLocation();
  const showBottomNav = !hidesBottomNav(pathname);
  // Product pages have their own 72px bar (price and Add to cart) on phones.
  const productBar = pathname.startsWith("/products/");

  return (
    <div className="flex min-h-dvh flex-col bg-linen">
      <AnnouncementBar />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter
        className={cx(
          showBottomNav &&
            "pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0",
          productBar && "pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0",
        )}
      />
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default ShopLayout;
