import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ChevronDown } from "lucide-react";
import LeafSprig from "../brand/LeafSprig";
import Sparkle from "../brand/Sparkle";
import { useStorefrontNav } from "../../services/catalog";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    "relative inline-flex h-11 items-center type-nav whitespace-nowrap transition-colors duration-150 hover:text-rosewood",
    "after:absolute after:inset-x-0 after:bottom-[5px] after:h-0.5 after:rounded-full after:bg-rosewood after:transition-transform after:duration-200 after:content-['']",
    isActive
      ? "text-rosewood after:scale-x-100"
      : "text-ink after:scale-x-0 hover:after:scale-x-100",
  );

/**
 * Desktop navigation from 1280px (brand doc section 6): Shop, New arrivals
 * and the five categories. "Shop" opens a panel with the six categories and
 * one image, on hover or click; Esc or leaving closes it.
 */
function DesktopNav() {
  const nav = useStorefrontNav();
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLLIElement>(null);

  const openSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 90);
  };
  const closeSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 180);
  };
  const keepOpen = () => window.clearTimeout(timer.current);

  // Close when the page changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const newArrivals = nav.collections.find((c) => c.slug === "new-arrivals");
  const featured = nav.categories.find((c) => c.image);

  return (
    <nav aria-label="Main" className="hidden xl:block">
      <ul className="flex items-center gap-7">
        <li
          ref={wrapperRef}
          onMouseEnter={openSoon}
          onMouseLeave={closeSoon}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className={cx(
              itemClass({ isActive: location.pathname.startsWith("/shop") }),
              "gap-1",
            )}
          >
            Shop
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cx(
                "transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
          <div
            id={panelId}
            hidden={!open}
            onMouseEnter={keepOpen}
            className="absolute inset-x-0 top-full animate-fade-in border-b border-sand-line bg-linen shadow-[0_16px_24px_-16px_rgba(36,27,34,0.18)]"
          >
            <div className="container-page grid grid-cols-12 gap-8 py-8">
              <div className="col-span-8 grid grid-cols-3 gap-x-8 gap-y-7">
                {nav.categories.map((category) => (
                  <div key={category.slug}>
                    <Link
                      to={routes.category(category.slug)}
                      className="font-semibold text-ink underline-offset-4 hover:text-rosewood hover:underline"
                    >
                      {category.name}
                    </Link>
                    {category.children.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {category.children.slice(0, 4).map((child) => (
                          <li key={child.slug}>
                            <Link
                              to={routes.category(child.slug)}
                              className="type-caption text-soft-ink underline-offset-4 hover:text-rosewood hover:underline"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {newArrivals && (
                  <div>
                    <Link
                      to={routes.collection(newArrivals.slug)}
                      className="font-semibold text-ink underline-offset-4 hover:text-rosewood hover:underline"
                    >
                      {newArrivals.name}
                    </Link>
                    <p className="mt-2 type-caption text-soft-ink">
                      The latest pieces, added this month.
                    </p>
                  </div>
                )}
                <div className="col-span-3 border-t border-sand-line pt-5">
                  <Link to={routes.shop} className="type-nav link">
                    Shop everything
                  </Link>
                </div>
              </div>
              <Link
                to={
                  featured ? routes.category(featured.slug) : routes.newArrivals
                }
                className="group/feature relative col-span-4 block aspect-[4/3] overflow-hidden corner-mask bg-clay-blush"
              >
                {featured?.image ? (
                  <img
                    src={imageUrl(featured.image, "site-media") ?? undefined}
                    alt=""
                    width={480}
                    height={360}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover/feature:scale-[1.03]"
                  />
                ) : (
                  <span aria-hidden="true" className="absolute inset-0">
                    <span className="absolute -top-10 -right-10 size-64 glow" />
                    <LeafSprig className="absolute right-8 bottom-6 h-3/4 text-rosewood/70" />
                  </span>
                )}
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-[10px_10px_10px_0] bg-paper/95 px-3 py-2 type-nav text-ink">
                  <Sparkle size={12} className="text-rosewood" />
                  {featured ? featured.name : "New arrivals"}
                </span>
              </Link>
            </div>
          </div>
        </li>
        {newArrivals && (
          <li>
            <NavLink
              to={routes.collection(newArrivals.slug)}
              className={itemClass}
            >
              {newArrivals.name}
            </NavLink>
          </li>
        )}
        {nav.categories.map((category) => (
          <li key={category.slug}>
            <NavLink to={routes.category(category.slug)} className={itemClass}>
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default DesktopNav;
