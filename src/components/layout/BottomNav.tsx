import { NavLink } from "react-router";
import {
  House,
  ShoppingBag,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useCartCount } from "../../features/cart/cartStore";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const items: Item[] = [
  { to: routes.home, label: "Home", icon: House, end: true },
  { to: routes.shop, label: "Shop", icon: Store },
  { to: routes.cart, label: "Cart", icon: ShoppingBag },
  { to: routes.account, label: "Account", icon: UserRound },
];

/**
 * Bottom navigation on phones (brand doc section 6): 56px, four items, always
 * visible. Hidden on the product page, cart and checkout, which have their
 * own action bar.
 */
function BottomNav() {
  const count = useCartCount();
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-linen pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-14 grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[12px] leading-4 transition-colors",
                  isActive
                    ? "font-semibold text-rosewood"
                    : "font-medium text-soft-ink hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-rosewood"
                    />
                  )}
                  <span className="relative">
                    <Icon size={22} aria-hidden="true" />
                    {to === routes.cart && count > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-rosewood px-1 text-[10px] leading-none font-bold text-white ring-2 ring-linen"
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  <span>
                    {label}
                    {to === routes.cart && count > 0 && (
                      <span className="sr-only">, {count} items</span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default BottomNav;
