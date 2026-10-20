import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Check } from "lucide-react";
import Spinner from "./Spinner";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./buttonStyles";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  CommonProps & {
    /** Spinner replaces the label; the button keeps its width. */
    loading?: boolean;
    /** Text read out while loading, for example "Placing your order". */
    loadingLabel?: string;
    /** Shows the green "done" state with a check (for example "Added"). */
    successLabel?: ReactNode;
  };

/**
 * The shop's button. Sentence-case labels that say what happens:
 * "Add to cart", "Place order · ৳2,140", "Save address".
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading = false,
  loadingLabel = "Please wait",
  successLabel,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const showSuccess = Boolean(successLabel) && !loading;
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={buttonClasses({
        variant: showSuccess ? "success" : variant,
        size,
        fullWidth,
        className,
      })}
      {...rest}
      onClick={loading ? (event) => event.preventDefault() : rest.onClick}
    >
      {showSuccess ? (
        <span className="inline-flex animate-fade-in items-center gap-2">
          <Check size={20} strokeWidth={2.25} aria-hidden="true" />
          {successLabel}
        </span>
      ) : (
        <>
          <span
            className={
              loading
                ? "invisible inline-flex items-center gap-2"
                : "inline-flex items-center gap-2"
            }
          >
            {children}
          </span>
          {loading && (
            <span className="absolute inset-0 grid place-items-center">
              <Spinner />
              <span className="sr-only">{loadingLabel}</span>
            </span>
          )}
        </>
      )}
    </button>
  );
}

type ButtonLinkProps = LinkProps & CommonProps;

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}

export default Button;
