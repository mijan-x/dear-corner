import { cx } from "../../utils/cx";

/** An on/off switch with its label; the state is in words too. */
function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-start gap-3 rounded-control py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-rosewood" : "bg-mauve-grey/50",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block type-body font-medium text-ink">
          {label}{" "}
          <span className="font-normal text-soft-ink">
            ({checked ? "on" : "off"})
          </span>
        </span>
        {description && (
          <span className="block type-helper">{description}</span>
        )}
      </span>
    </button>
  );
}

export default Toggle;
