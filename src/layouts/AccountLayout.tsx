import { Suspense, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import PageLoader from "../components/system/PageLoader";
import Sparkle from "../components/brand/Sparkle";
import { signOut, useAuth } from "../features/auth/session";
import { routes } from "../lib/routes";
import { useProfile } from "../services/account";
import { cx } from "../utils/cx";

const links: { to: string; label: string; icon: LucideIcon; end?: boolean }[] =
  [
    { to: routes.account, label: "Orders", icon: Package, end: true },
    { to: routes.wishlist, label: "Wishlist", icon: Heart },
    { to: routes.addresses, label: "Addresses", icon: MapPin },
    { to: routes.profile, label: "Profile", icon: UserRound },
  ];

/**
 * The signed-in area: orders, wishlist, saved addresses and profile.
 * Visitors who aren't signed in are sent to sign in and brought back.
 */
function AccountLayout() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile(auth.user?.id);
  const [leaving, setLeaving] = useState(false);

  if (auth.status === "loading" || leaving) return <PageLoader />;
  if (auth.status === "guest") {
    return (
      <Navigate
        to={routes.signInNext(location.pathname + location.search)}
        replace
      />
    );
  }

  const firstName = profile?.fullName.trim().split(/\s+/)[0];
  const leave = async () => {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      navigate(routes.home, { replace: true });
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "flex min-h-11 items-center gap-3 rounded-control px-3.5 type-nav whitespace-nowrap transition-colors",
      isActive
        ? "bg-clay-blush font-semibold text-rosewood"
        : "text-ink hover:bg-cream",
    );

  return (
    <div className="container-page pt-6 pb-20 md:pt-10">
      <header className="mb-6 md:mb-8">
        <p className="flex items-center gap-2 type-eyebrow text-terracotta-deep">
          <Sparkle size={12} className="text-rosewood" />
          Your account
        </p>
        <p className="mt-2 font-display text-[28px] leading-tight text-ink md:text-[34px]">
          Hello{firstName ? `, ${firstName}` : ""}
        </p>
        {auth.user.email && (
          <p className="mt-1 type-body text-soft-ink">{auth.user.email}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Account" className="-mx-4 min-w-0 lg:mx-0">
          <ul className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-1 lg:flex-col lg:overflow-visible lg:px-0">
            {links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={linkClass}>
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li className="lg:mt-3 lg:border-t lg:border-sand-line lg:pt-3">
              <button
                type="button"
                onClick={leave}
                className="flex min-h-11 w-full items-center gap-3 rounded-control px-3.5 type-nav whitespace-nowrap text-soft-ink transition-colors hover:bg-cream hover:text-ink"
              >
                <LogOut size={19} aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        <div className="min-w-0">
          <Suspense fallback={<PageLoader className="min-h-[30vh]" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default AccountLayout;
