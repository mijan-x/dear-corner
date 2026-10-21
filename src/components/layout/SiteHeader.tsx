import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { HeaderLogo } from "../brand/Logo";
import { IconButton, IconLink } from "../ui/IconButton";
import DesktopNav from "./DesktopNav";
import MenuDrawer from "./MenuDrawer";
import SearchDialog from "./SearchDialog";
import { useCartCount } from "../../features/cart/cartStore";
import { cartDrawer } from "../../features/cart/cartDrawer";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";

/** True once the sticky header has reached the top of the screen. */
function useStuck(ref: React.RefObject<HTMLElement | null>) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const stickyTop = parseFloat(getComputedStyle(el).top) || 0;
      setStuck(
        window.scrollY > 0 && el.getBoundingClientRect().top <= stickyTop + 0.5,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
  return stuck;
}

/**
 * Header (brand doc section 6).
 * Phones and tablets: 56px; menu left, compact wordmark centered, search
 * and cart right (account too from 768px).
 * Desktop: 72px, horizontal logo at 32px. The full navigation shows from
 * 1280px; below that the menu drawer is used. Sticky; once it reaches the top
 * it shows 60px (its top 12px tuck under the screen edge), so nothing on the
 * page moves while it shrinks and scrolling never jumps. The logo keeps its
 * 32px height.
 */
function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const count = useCartCount();
  const ref = useRef<HTMLDivElement>(null);
  const stuck = useStuck(ref);

  return (
    <>
      <div ref={ref} className="sticky top-0 z-40 lg:-top-3">
        <header className="relative h-14 border-b border-sand-line bg-linen lg:h-[72px]">
          <div
            className={cx(
              "container-page grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2 transition-transform duration-200 ease-out xl:flex xl:justify-between xl:gap-8",
              stuck && "lg:translate-y-1.5",
            )}
          >
            <div className="flex items-center xl:hidden">
              <IconButton
                label="Open menu"
                icon={<Menu aria-hidden="true" />}
                onClick={() => setMenuOpen(true)}
                aria-haspopup="dialog"
                className="-ml-2.5"
              />
            </div>

            <Link
              to={routes.home}
              aria-label="Dear Corner, home"
              className="inline-flex shrink-0 items-center justify-self-center rounded-control py-1.5"
            >
              <HeaderLogo />
            </Link>

            <DesktopNav />

            <div className="flex items-center justify-end gap-0.5 xl:-mr-2.5">
              <IconButton
                label="Search"
                icon={<Search aria-hidden="true" />}
                onClick={() => setSearchOpen(true)}
                aria-haspopup="dialog"
              />
              {/* Phones reach the account from the bottom navigation. */}
              <span className="hidden md:contents">
                <IconLink
                  to={routes.account}
                  label="Your account"
                  icon={<UserRound aria-hidden="true" />}
                />
              </span>
              <IconButton
                label="Cart"
                count={count}
                icon={<ShoppingBag aria-hidden="true" />}
                onClick={() => cartDrawer.open()}
                aria-haspopup="dialog"
                className="-mr-2.5 xl:mr-0"
              />
            </div>
          </div>
        </header>
      </div>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export default SiteHeader;
