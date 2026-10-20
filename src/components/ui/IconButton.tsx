import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cx } from "../../utils/cx";

/**
 * Icon-only controls: 44px touch area, 24px Lucide icon at 1.75 stroke,
 * always with an accessible name. An optional count badge (cart).
 */
const iconButtonBase =
  "relative inline-grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-clay-blush/70 hover:text-rosewood active:bg-clay-blush disabled:cursor-not-allowed disabled:text-soft-ink disabled:hover:bg-transparent";

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute top-0.5 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rosewood px-1 text-[11px] leading-none font-bold text-white ring-2 ring-linen"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  count?: number;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, icon, count, className, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={count ? `${label}, ${count} items` : label}
        className={cx(iconButtonBase, className)}
        {...rest}
      >
        {icon}
        <CountBadge count={count} />
      </button>
    );
  },
);

type IconLinkProps = LinkProps & {
  label: string;
  icon: ReactNode;
  count?: number;
};

export function IconLink({
  label,
  icon,
  count,
  className,
  ...rest
}: IconLinkProps) {
  return (
    <Link
      aria-label={count ? `${label}, ${count} items` : label}
      className={cx(iconButtonBase, className)}
      {...rest}
    >
      {icon}
      <CountBadge count={count} />
    </Link>
  );
}

export default IconButton;
