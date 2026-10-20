import { useState } from "react";
import { Link, NavLink } from "react-router";
import {
  ChevronDown,
  Heart,
  MessageCircle,
  PackageSearch,
  UserRound,
  X,
} from "lucide-react";
import Dialog from "../ui/Dialog";
import { IconButton } from "../ui/IconButton";
import Logo from "../brand/Logo";
import { useStorefrontNav } from "../../services/catalog";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";

const rowClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    "flex min-h-12 flex-1 items-center text-[17px] leading-6 font-medium transition-colors",
    isActive ? "text-rosewood" : "text-ink hover:text-rosewood",
  );

/**
 * Menu drawer for phones and tablets (brand doc section 6): from the left,
 * 85% wide, with the categories, Track order and Contact. Closes on Esc, on
 * the backdrop and whenever a link is followed.
 */
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useStorefrontNav();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="left"
      title="Menu"
      header={
        <div className="flex shrink-0 items-center justify-between border-b border-sand-line py-2 pr-2 pl-5">
          <Logo variant="compact" height={18} />
          <IconButton
            label="Close menu"
            icon={<X aria-hidden="true" />}
            onClick={onClose}
          />
        </div>
      }
    >
      <nav aria-label="Menu" className="flex min-h-full flex-col px-5 py-3">
        <ul className="divide-y divide-sand-line/70">
          <li className="flex">
            <NavLink
              to={routes.shop}
              end
              className={rowClass}
              onClick={onClose}
            >
              Shop all
            </NavLink>
          </li>
          {nav.collections.map((collection) => (
            <li key={collection.slug} className="flex">
              <NavLink
                to={routes.collection(collection.slug)}
                className={rowClass}
                onClick={onClose}
              >
                {collection.name}
              </NavLink>
            </li>
          ))}
          {nav.categories.map((category) => {
            const isOpen = expanded === category.slug;
            const hasChildren = category.children.length > 0;
            const listId = `menu-${category.slug}`;
            return (
              <li key={category.slug}>
                <div className="flex items-center">
                  <NavLink
                    to={routes.category(category.slug)}
                    className={rowClass}
                    onClick={onClose}
                  >
                    {category.name}
                  </NavLink>
                  {hasChildren && (
                    <IconButton
                      label={`${isOpen ? "Hide" : "Show"} ${category.name} sections`}
                      aria-expanded={isOpen}
                      aria-controls={listId}
                      onClick={() => setExpanded(isOpen ? null : category.slug)}
                      icon={
                        <ChevronDown
                          aria-hidden="true"
                          className={cx(
                            "transition-transform duration-200",
                            isOpen && "rotate-180",
                          )}
                        />
                      }
                    />
                  )}
                </div>
                {hasChildren && (
                  <ul id={listId} hidden={!isOpen} className="pb-3 pl-4">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <NavLink
                          to={routes.category(child.slug)}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cx(
                              "flex min-h-11 items-center type-body",
                              isActive
                                ? "text-rosewood"
                                : "text-soft-ink hover:text-rosewood",
                            )
                          }
                        >
                          {child.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <ul className="mt-6 space-y-1 rounded-card bg-paper p-2">
          {[
            {
              to: routes.trackOrder,
              label: "Track your order",
              icon: PackageSearch,
            },
            { to: routes.account, label: "Your account", icon: UserRound },
            { to: routes.wishlist, label: "Wishlist", icon: Heart },
            { to: routes.contact, label: "Contact us", icon: MessageCircle },
          ].map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={onClose}
                className="flex min-h-11 items-center gap-3 rounded-control px-3 type-body text-ink hover:bg-clay-blush/50 hover:text-rosewood"
              >
                <Icon size={20} aria-hidden="true" className="text-rosewood" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-auto pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] type-caption text-soft-ink">
          Cash on Delivery across Bangladesh.{" "}
          <Link to={routes.faq} onClick={onClose} className="link">
            Questions?
          </Link>
        </p>
      </nav>
    </Dialog>
  );
}

export default MenuDrawer;
