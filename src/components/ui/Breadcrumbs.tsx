import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { cx } from "../../utils/cx";

export type Crumb = { label: string; to?: string };

/** Breadcrumb trail; the last item is the current page. */
function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cx("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 type-caption text-soft-ink">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-1"
            >
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="rounded-badge py-1 underline-offset-4 hover:text-rosewood hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="py-1 text-ink"
                >
                  {item.label}
                </span>
              )}
              {!last && (
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="text-mauve-grey"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
