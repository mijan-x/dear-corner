import { Suspense, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import {
  Boxes,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Star,
  TicketPercent,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Logo from "../components/brand/Logo";
import Dialog from "../components/ui/Dialog";
import { Button, ButtonLink } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import Notice from "../components/ui/Notice";
import PageLoader from "../components/system/PageLoader";
import TwoStep from "../admin/components/TwoStep";
import { useAdminAccess } from "../admin/lib/access";
import { useAdminQuery } from "../admin/lib/data";
import { admin } from "../admin/lib/paths";
import { fetchDashboard } from "../admin/services/dashboard";
import { signOut } from "../features/auth/session";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import { cx } from "../utils/cx";

type Item = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  count?: "orders" | "reviews" | "messages";
};

const items: Item[] = [
  { to: admin.home, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: admin.orders, label: "Orders", icon: ShoppingBag, count: "orders" },
  { to: admin.products, label: "Products", icon: Package },
  { to: admin.inventory, label: "Inventory", icon: Boxes },
  { to: admin.coupons, label: "Coupons", icon: TicketPercent },
  { to: admin.customers, label: "Customers", icon: Users },
  { to: admin.shipping, label: "Shipping", icon: Truck },
  { to: admin.reviews, label: "Reviews", icon: Star, count: "reviews" },
  { to: admin.messages, label: "Messages", icon: Mail, count: "messages" },
  { to: admin.settings, label: "Settings", icon: Settings },
  { to: admin.activity, label: "Activity", icon: History },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useAdminQuery("dashboard", fetchDashboard);
  const counts = {
    orders: data?.pendingOrders ?? 0,
    reviews: data?.pendingReviews ?? 0,
    messages: data?.newMessages ?? 0,
  };
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end, count }) => {
        const n = count ? counts[count] : 0;
        return (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cx(
                  "flex min-h-11 items-center gap-3 rounded-control px-3 type-nav transition-colors",
                  isActive
                    ? "bg-clay-blush font-semibold text-rosewood"
                    : "text-ink hover:bg-cream",
                )
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {n > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rosewood px-1.5 text-[11px] font-bold text-white">
                  {n}
                  <span className="sr-only">
                    {count === "orders"
                      ? " new orders"
                      : count === "reviews"
                        ? " to check"
                        : " new"}
                  </span>
                </span>
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function Shell({ email }: { email: string | null }) {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const leave = async () => {
    await signOut().catch(() => {});
    navigate(routes.home, { replace: true });
  };
  const footer = (
    <div className="space-y-1 border-t border-sand-line pt-3">
      <a
        href={routes.home}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-3 rounded-control px-3 type-nav text-ink hover:bg-cream"
      >
        <ExternalLink size={19} aria-hidden="true" />
        View the shop
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <button
        type="button"
        onClick={leave}
        className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 type-nav text-soft-ink hover:bg-cream hover:text-ink"
      >
        <LogOut size={19} aria-hidden="true" />
        Sign out
      </button>
      {email && (
        <p className="truncate px-3 pt-1 type-caption text-soft-ink">{email}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-linen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-sand-line bg-paper px-4 py-6 lg:flex">
        <Link
          to={admin.home}
          className="px-2"
          aria-label="Dear Corner admin home"
        >
          <Logo variant="horizontal" width={184} />
        </Link>
        <nav aria-label="Admin" className="flex-1">
          <Nav />
        </nav>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-sand-line bg-paper/95 px-2 backdrop-blur-sm lg:hidden">
        <IconButton
          label="Open admin menu"
          icon={<Menu aria-hidden="true" />}
          onClick={() => setMenu(true)}
          aria-haspopup="dialog"
        />
        <Link to={admin.home} aria-label="Dear Corner admin home">
          <Logo variant="compact" width={120} />
        </Link>
        <span className="w-11" aria-hidden="true" />
      </header>
      <Dialog
        open={menu}
        onClose={() => setMenu(false)}
        variant="left"
        title="Admin menu"
        bodyClassName="flex flex-col gap-6 px-3 py-4"
      >
        <nav aria-label="Admin">
          <Nav onNavigate={() => setMenu(false)} />
        </nav>
        {footer}
      </Dialog>

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 px-4 pt-6 pb-16 focus:outline-none md:px-8 lg:pt-8"
      >
        <Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * The admin frame. Only an admin account that has passed two-step login gets
 * in; the database refuses every admin request otherwise.
 */
function AdminLayout({ bare = false }: { bare?: boolean }) {
  usePageMeta({ title: "Admin", noindex: true });
  const access = useAdminAccess();
  const location = useLocation();

  if (access.status === "loading") return <PageLoader className="min-h-dvh" />;
  if (access.status === "guest") {
    return (
      <Navigate
        to={routes.signInNext(location.pathname + location.search)}
        replace
      />
    );
  }
  if (access.status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Notice
          tone="error"
          action={
            <Button variant="secondary" size="sm" onClick={access.recheck}>
              Try again
            </Button>
          }
        >
          {toShopError(access.error).message}
        </Notice>
      </div>
    );
  }
  if (access.status === "not-admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="type-h2 text-ink">This page is for the shop team</h1>
        <p className="mt-3 type-body text-soft-ink">
          {access.email
            ? `${access.email} isn't an admin account.`
            : "This account isn't an admin."}{" "}
          If it should be, the owner can give it the admin role.
        </p>
        <ButtonLink to={routes.home} className="mt-6">
          Back to the shop
        </ButtonLink>
      </div>
    );
  }
  if (access.status === "enroll")
    return <TwoStep mode="enroll" onDone={access.recheck} />;
  if (access.status === "code") {
    return (
      <TwoStep mode="code" factorId={access.factorId} onDone={access.recheck} />
    );
  }
  if (bare) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    );
  }
  return <Shell email={access.email} />;
}

export default AdminLayout;
