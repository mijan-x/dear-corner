import { useId } from "react";
import { cx } from "../../utils/cx";

export type OptionChoice = {
  id: string;
  value: string;
  /** Swatch color for color options. */
  hex?: string | null;
  /** Sold out or not made in this combination: crossed out and not selectable. */
  unavailable?: boolean;
};

type OptionPickerProps = {
  /** Option name: "Color", "Size". */
  label: string;
  kind: "swatch" | "button";
  choices: OptionChoice[];
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * Variant selector (brand doc section 6): 36px color swatches or size buttons
 * of at least 44×44px. Unavailable choices are crossed with a diagonal line
 * and named in text below, never shown by color alone.
 */
function OptionPicker({
  label,
  kind,
  choices,
  value,
  onChange,
  className,
}: OptionPickerProps) {
  const name = useId();
  const selected = choices.find((choice) => choice.id === value);
  const unavailable = choices.filter((choice) => choice.unavailable);

  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend className="mb-3 type-label text-ink">
        {label}
        {selected && (
          <>
            :{" "}
            <span className="font-normal text-soft-ink">{selected.value}</span>
          </>
        )}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {choices.map((choice) => {
          const checked = choice.id === value;
          return (
            <label
              key={choice.id}
              title={choice.value}
              className={cx(
                "relative cursor-pointer has-disabled:cursor-not-allowed",
                kind === "swatch" ? "grid size-11 place-items-center" : "",
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.id}
                checked={checked}
                disabled={choice.unavailable}
                onChange={() => onChange(choice.id)}
                className="peer sr-only"
              />
              {kind === "swatch" ? (
                <span
                  aria-hidden="true"
                  className={cx(
                    "relative block size-9 overflow-hidden rounded-full border border-ink/15 ring-offset-2 ring-offset-linen transition-shadow duration-150",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-rosewood",
                    checked
                      ? "ring-2 ring-rosewood"
                      : "hover:ring-2 hover:ring-mauve-grey/60",
                  )}
                  style={{ backgroundColor: choice.hex ?? "#efe7dd" }}
                >
                  {choice.unavailable && <DiagonalLine />}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cx(
                    "relative flex h-11 min-w-11 items-center justify-center overflow-hidden rounded-control border px-4 type-nav transition-[border-color,box-shadow,background-color] duration-150",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rosewood",
                    choice.unavailable
                      ? "border-sand-line bg-soft-sand text-soft-ink"
                      : checked
                        ? "border-rosewood bg-cream text-rosewood shadow-[inset_0_0_0_1px_var(--color-rosewood)]"
                        : "border-mauve-grey bg-paper text-ink hover:border-rosewood",
                  )}
                >
                  {choice.value}
                  {choice.unavailable && <DiagonalLine />}
                </span>
              )}
              <span className="sr-only">
                {choice.value}
                {choice.unavailable ? " (sold out)" : ""}
              </span>
            </label>
          );
        })}
      </div>
      {unavailable.length > 0 && (
        <p className="mt-2 type-helper">
          Sold out: {unavailable.map((choice) => choice.value).join(", ")}
        </p>
      )}
    </fieldset>
  );
}

function DiagonalLine() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full text-soft-ink"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <line
        x1="4"
        y1="96"
        x2="96"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default OptionPicker;
