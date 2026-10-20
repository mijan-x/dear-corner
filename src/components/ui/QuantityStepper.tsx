import { Minus, Plus } from "lucide-react";
import { cx } from "../../utils/cx";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Names the item for screen readers ("Pleated table lamp, Ivory"). */
  itemLabel?: string;
  disabled?: boolean;
  size?: "md" | "sm";
  className?: string;
};

/** − 1 + with 44px buttons. The number is announced when it changes. */
function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  itemLabel,
  disabled,
  size = "md",
  className,
}: QuantityStepperProps) {
  const button =
    "grid size-11 place-items-center text-ink transition-colors hover:bg-clay-blush/70 hover:text-rosewood disabled:cursor-not-allowed disabled:text-mauve-grey disabled:hover:bg-transparent";
  const name = itemLabel ? ` of ${itemLabel}` : "";
  return (
    <div
      role="group"
      aria-label={`Quantity${name}`}
      className={cx(
        "inline-flex w-fit items-center overflow-hidden rounded-control border border-mauve-grey bg-paper",
        size === "sm" ? "h-11" : "h-12",
        className,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease quantity${name}`}
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        className="min-w-9 text-center figures text-[16px] font-semibold"
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase quantity${name}`}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default QuantityStepper;
