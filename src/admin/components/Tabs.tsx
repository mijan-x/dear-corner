import { NavLink } from "react-router";
import { cx } from "../../utils/cx";

/** Page tabs as links (each tab has its own address). */
function Tabs({
  items,
  label,
}: {
  items: { to: string; label: string; end?: boolean }[];
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-sand-line"
    >
      {items.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cx(
              "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 type-nav whitespace-nowrap",
              isActive
                ? "border-rosewood font-semibold text-rosewood"
                : "border-transparent text-soft-ink hover:text-ink",
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Tabs;
