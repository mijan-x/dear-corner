import { lazy, Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import AnnouncementBar from "../components/layout/AnnouncementBar";
import SiteHeader from "../components/layout/SiteHeader";
import SiteFooter from "../components/layout/SiteFooter";
import BottomNav from "../components/layout/BottomNav";
import PageLoader from "../components/system/PageLoader";
import { hidesBottomNav } from "../lib/routes";
import { useCartDrawerUsed } from "../features/cart/cartDrawer";
import { cx } from "../utils/cx";

// The cart drawer's code loads when the page is idle (or on first open).
const loadCartDrawer = () => import("../components/cart/CartDrawer");
const CartDrawer = lazy(loadCartDrawer);

/**
 * The storefront frame: announcement bar, sticky header, page, footer and,
 * on phones, the bottom navigation. Pages load inside it, so the header and
 * footer stay put while the lamp-glow loader shows.
 */
function ShopLayout() {
  const { pathname } = useLocation();
  const showBottomNav = !hidesBottomNav(pathname);
  const drawerUsed = useCartDrawerUsed();

  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 2000));
    idle(() => void loadCartDrawer());
  }, []);
  // Product, cart and checkout pages have their own 72px action bar on phones.
  const actionBar =
    pathname.startsWith("/products/") ||
    pathname === "/cart" ||
    pathname === "/checkout";

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
          actionBar && "pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0",
        )}
      />
      {showBottomNav && <BottomNav />}
      {drawerUsed && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}
    </div>
  );
}

export default ShopLayout;
