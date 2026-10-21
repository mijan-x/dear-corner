import { useId, useState, type FormEvent } from "react";
import { CircleAlert, Tag, X } from "lucide-react";
import { Button } from "../ui/Button";
import { controlClasses } from "../ui/fieldStyles";
import { errorCopy } from "../ui/emptyStateCopy";
import { couponStore, type Quote } from "../../services/cart";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Coupon code (brand doc section 6): the database checks it (validity,
 * expiry, minimum, usage limits, categories) and the quote shows the result.
 */
function CouponField({
  quote,
  checking,
}: {
  quote?: Quote;
  /** A new quote is on its way. */
  checking?: boolean;
}) {
  const id = useId();
  const code = couponStore.useStore();
  const [value, setValue] = useState("");
  const coupon = quote?.coupon;
  const result = coupon && coupon.code === code.toUpperCase() ? coupon : null;

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const next = value.trim().toUpperCase();
    if (!next) return;
    couponStore.set(next);
  };

  if (code && result?.status === "applied") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-control border border-success/30 bg-success-bg px-3.5 py-2.5">
        <p className="flex min-w-0 items-center gap-2 type-body text-success">
          <Tag size={18} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold">{result.code}</span> applied
            {result.discount > 0 && (
              <>
                {" "}
                · you save{" "}
                <span className="figures font-semibold">
                  {formatPrice(result.discount)}
                </span>
              </>
            )}
          </span>
        </p>
        <button
          type="button"
          onClick={() => couponStore.set("")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-success hover:bg-white/60"
          aria-label={`Remove code ${result.code}`}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  const message =
    code && result && result.status !== "applied" && result.status !== "none"
      ? result.status === "invalid"
        ? errorCopy.coupon
        : (result.message ?? errorCopy.coupon)
      : null;

  return (
    <form onSubmit={apply} noValidate>
      <label htmlFor={id} className="type-label text-ink">
        Coupon code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. WELCOME10"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className={controlClasses({
            invalid: Boolean(message),
            className:
              "h-11 min-w-0 flex-1 px-3.5 uppercase placeholder:normal-case",
          })}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={Boolean(checking && code && !result)}
          loadingLabel="Checking the code"
        >
          Apply
        </Button>
      </div>
      {message && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-start gap-1.5 type-helper text-error!"
        >
          <CircleAlert
            size={16}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          <span>
            {message}{" "}
            <button
              type="button"
              onClick={() => {
                couponStore.set("");
                setValue("");
              }}
              className="font-medium underline underline-offset-2"
            >
              Remove code
            </button>
          </span>
        </p>
      )}
    </form>
  );
}

export default CouponField;
