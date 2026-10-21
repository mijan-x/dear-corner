import type { ReactNode } from "react";
import { Link } from "react-router";
import Sparkle from "../brand/Sparkle";
import { cx } from "../../utils/cx";

/**
 * Section heading with an optional eyebrow and a "View all" link on the right.
 * The sparkle is the one-per-layout device: pass `sparkle` on one section only.
 */
function SectionHeading({
  title,
  eyebrow,
  sparkle = false,
  description,
  link,
  actions,
  id,
  className,
}: {
  title: ReactNode;
  eyebrow?: string;
  sparkle?: boolean;
  description?: ReactNode;
  link?: { to: string; label: string };
  /** Extra controls on the right (row arrows). */
  actions?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 type-eyebrow text-terracotta-deep">
            {sparkle && <Sparkle size={12} className="text-rosewood" />}
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="type-h2 text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-2 type-body text-soft-ink">{description}</p>
        )}
      </div>
      {(link || actions) && (
        <div className="flex items-center gap-4">
          {link && (
            <Link
              to={link.to}
              className="inline-flex min-h-11 items-center type-nav link"
            >
              {link.label}
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

export default SectionHeading;
