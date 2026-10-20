import type { ReactNode } from "react";
import type { BadgeKind } from "../../features/catalog/badges";
import { cx } from "../../utils/cx";

/**
 * Badges (brand doc section 6): 24px high, 8px side padding, DM Sans 700 12px,
 * with the brand's corner: rounded except a sharp bottom-left.
 */
const styles: Record<BadgeKind, string> = {
  new: "bg-lamp-glow text-ink",
  sale: "bg-terracotta-deep text-white",
  bestseller: "bg-rosewood text-white",
  gift: "bg-clay-blush text-rosewood",
  "low-stock": "bg-warning-bg text-warning",
  "sold-out": "bg-soft-sand text-soft-ink",
  "free-delivery": "bg-success-bg text-success",
};

function Badge({
  kind,
  children,
  className,
}: {
  kind: BadgeKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-[6px_6px_6px_0] px-2 type-badge whitespace-nowrap",
        styles[kind],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
