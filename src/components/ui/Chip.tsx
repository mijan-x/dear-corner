import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NavLink, type NavLinkProps } from "react-router";
import { X } from "lucide-react";
import { cx } from "../../utils/cx";

/**
 * Pill chips (full radius): sub-category links, toggles and applied filters.
 * 40px tall with the tap area stretched to 44px.
 */
const chipBase =
  "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 type-nav whitespace-nowrap transition-colors duration-150 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-['']";
const chipIdle =
  "border-sand-line bg-paper text-ink hover:border-rosewood hover:text-rosewood";
const chipActive =
  "border-rosewood bg-rosewood text-white hover:bg-rosewood-hover";

/** Navigation chip (sub-categories). The current page is filled. */
export function ChipLink({ className, ...rest }: NavLinkProps) {
  return (
    <NavLink
      end
      className={({ isActive }) =>
        cx(chipBase, isActive ? chipActive : chipIdle, className as string)
      }
      {...rest}
    />
  );
}

type ToggleChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

/** On/off chip ("In stock", "On sale"). */
export function ToggleChip({
  selected = false,
  className,
  children,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(chipBase, selected ? chipActive : chipIdle, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** An applied filter; the whole chip removes it. */
export function FilterChip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  /** "Remove filter: Sage". */
  removeLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className={cx(
        chipBase,
        "border-rosewood/40 bg-cream pr-3 text-ink hover:border-rosewood",
      )}
    >
      {children}
      <X size={16} aria-hidden="true" className="text-rosewood" />
    </button>
  );
}
