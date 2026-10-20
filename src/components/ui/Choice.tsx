import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "../../utils/cx";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

/** Checkbox with its label; the whole row is the 44px tap target. */
export function Checkbox({
  label,
  description,
  className,
  ...input
}: CheckboxProps) {
  return (
    <label
      className={cx(
        "group flex min-h-11 cursor-pointer items-start gap-3 py-2.5 has-disabled:cursor-not-allowed",
        className,
      )}
    >
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[5px] border border-mauve-grey bg-paper transition-colors checked:border-rosewood checked:bg-rosewood hover:border-ink/60 disabled:cursor-not-allowed disabled:border-sand-line disabled:bg-soft-sand"
          {...input}
        />
        <Check
          size={14}
          strokeWidth={3}
          absoluteStrokeWidth={false}
          aria-hidden="true"
          className="pointer-events-none absolute text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col">
        <span className="type-body text-ink group-has-disabled:text-soft-ink">
          {label}
        </span>
        {description && <span className="type-helper">{description}</span>}
      </span>
    </label>
  );
}

type RadioCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  /** Shown on the right, for example a delivery fee. */
  aside?: ReactNode;
  icon?: ReactNode;
};

/**
 * A radio option as a card: delivery method, payment method.
 * Selected: 2px rosewood border and a filled dot (not color alone).
 */
export function RadioCard({
  label,
  description,
  aside,
  icon,
  className,
  ...input
}: RadioCardProps) {
  return (
    <label
      className={cx(
        "flex min-h-14 cursor-pointer items-start gap-3 rounded-control border border-sand-line bg-paper px-4 py-3.5 transition-[border-color,box-shadow,background-color] duration-150 hover:border-mauve-grey has-checked:border-rosewood has-checked:bg-cream has-checked:shadow-[inset_0_0_0_1px_var(--color-rosewood)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-rosewood has-disabled:cursor-not-allowed has-disabled:bg-soft-sand",
        className,
      )}
    >
      <input
        type="radio"
        className="mt-1 grid size-5 shrink-0 cursor-pointer appearance-none place-items-center rounded-full border border-mauve-grey bg-paper transition-colors before:size-2.5 before:scale-0 before:rounded-full before:bg-rosewood before:transition-transform before:content-[''] checked:border-rosewood checked:before:scale-100 focus-visible:outline-none disabled:border-sand-line"
        {...input}
      />
      {icon && (
        <span className="mt-0.5 text-rosewood" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-ink">{label}</span>
        {description && (
          <span className="type-caption text-soft-ink">{description}</span>
        )}
      </span>
      {aside && <span className="shrink-0 figures font-bold">{aside}</span>}
    </label>
  );
}
