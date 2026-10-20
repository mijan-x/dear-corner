import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cx } from "../../utils/cx";
import { controlClasses } from "./fieldStyles";

type ShellProps = {
  id: string;
  label: ReactNode;
  optional?: boolean;
  helper?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label above (never placeholder-only), helper below, error with an icon. */
function FieldShell({
  id,
  label,
  optional,
  helper,
  error,
  className,
  children,
}: ShellProps) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="type-label text-ink">
        {label}
        {optional && (
          <span className="font-normal text-soft-ink"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 type-helper text-error!"
        >
          <CircleAlert
            size={16}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="type-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: ReactNode, helper?: ReactNode) {
  if (error) return `${id}-error`;
  if (helper) return `${id}-helper`;
  return undefined;
}

type BaseFieldProps = {
  label: ReactNode;
  optional?: boolean;
  helper?: ReactNode;
  error?: ReactNode;
  className?: string;
};

type TextFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    inputClassName?: string;
  };

export function TextField({
  label,
  optional,
  helper,
  error,
  className,
  inputClassName,
  id: idProp,
  ...input
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell {...{ id, label, optional, helper, error, className }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, helper)}
        className={controlClasses({
          invalid: Boolean(error),
          className: cx("h-12 px-4", inputClassName),
        })}
        {...input}
      />
    </FieldShell>
  );
}

/**
 * Bangladesh mobile number: shows +880 and takes the 11-digit number
 * starting with 01 (01712345678), the way people write it.
 */
export function PhoneField({
  label = "Mobile number",
  helper = "11 digits, starting with 01. We'll call this number to confirm your order.",
  ...props
}: Omit<TextFieldProps, "label"> & { label?: ReactNode }) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const { optional, error, className, inputClassName, ...input } = props;
  return (
    <FieldShell {...{ id, label, optional, helper, error, className }}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-sand-line pr-3 pl-4 text-[16px] text-soft-ink"
        >
          +880
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          placeholder="01XXXXXXXXX"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, helper)}
          className={controlClasses({
            invalid: Boolean(error),
            className: cx("h-12 pr-4 pl-[86px]", inputClassName),
          })}
          {...input}
        />
      </div>
    </FieldShell>
  );
}

type TextAreaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function TextAreaField({
  label,
  optional,
  helper,
  error,
  className,
  id: idProp,
  rows = 4,
  ...textarea
}: TextAreaFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell {...{ id, label, optional, helper, error, className }}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, helper)}
        className={controlClasses({
          invalid: Boolean(error),
          className: "min-h-24 resize-y px-4 py-3",
        })}
        {...textarea}
      />
    </FieldShell>
  );
}

type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    placeholder?: string;
  };

/** Native select (best on phones), styled to match the other fields. */
export function SelectField({
  label,
  optional,
  helper,
  error,
  className,
  id: idProp,
  placeholder,
  children,
  ...select
}: SelectFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell {...{ id, label, optional, helper, error, className }}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, helper)}
          className={controlClasses({
            invalid: Boolean(error),
            className:
              "h-12 cursor-pointer appearance-none pr-11 pl-4 disabled:cursor-not-allowed",
          })}
          {...select}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-soft-ink"
        />
      </div>
    </FieldShell>
  );
}
