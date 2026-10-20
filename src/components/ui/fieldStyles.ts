import { cx } from "../../utils/cx";

/**
 * Form controls (brand doc section 6): 48px, white fill, 1px mauve-grey
 * border, 10px radius, 16px text (no iOS zoom). Focus: 2px rosewood border.
 * Error: 2px error border plus an icon and message below, never color alone.
 * The second pixel is an inset ring, so the field never shifts.
 */
export function controlClasses({
  invalid,
  className,
}: { invalid?: boolean; className?: string } = {}) {
  return cx(
    "block w-full rounded-control border bg-paper text-[16px] leading-6 text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-mauve-grey",
    "focus:outline-none focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:border-sand-line disabled:bg-soft-sand disabled:text-soft-ink",
    invalid
      ? "border-error shadow-[inset_0_0_0_1px_var(--color-error)]"
      : "border-mauve-grey hover:border-ink/60 focus:border-rosewood focus:shadow-[inset_0_0_0_1px_var(--color-rosewood)]",
    className,
  );
}
