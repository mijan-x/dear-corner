import { cx } from "../../utils/cx";

/**
 * Button looks (brand doc section 6, Rosewood in place of Plum Ink):
 *  primary    rosewood fill, white text; hover #5E373C, pressed #4A2B2F
 *  secondary  white fill, 1.5px rosewood border, rosewood text; hover clay blush
 *  quiet      no fill, rosewood text (tertiary actions next to a primary)
 *  light      linen fill, ink text: for night plum and rosewood panels
 *  success    the 1.5s "Added" state after add to cart
 * Disabled controls get their own look (soft sand fill, soft ink text), not
 * only a lighter color.
 */
export type ButtonVariant =
  "primary" | "secondary" | "quiet" | "light" | "success";
export type ButtonSize = "md" | "sm";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-control type-button whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100 aria-disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-rosewood text-white hover:bg-rosewood-hover active:bg-rosewood-pressed disabled:bg-soft-sand disabled:text-soft-ink",
  secondary:
    "border-[1.5px] border-rosewood bg-paper text-rosewood hover:bg-clay-blush active:bg-clay-blush disabled:border-sand-line disabled:bg-soft-sand disabled:text-soft-ink",
  quiet:
    "text-rosewood underline-offset-4 hover:bg-clay-blush/60 hover:underline disabled:text-soft-ink disabled:no-underline",
  light:
    "bg-linen text-ink hover:bg-cream active:bg-soft-sand disabled:bg-soft-sand disabled:text-soft-ink",
  success: "bg-success text-white",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-12 px-6",
  sm: "h-11 px-5",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cx(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}
