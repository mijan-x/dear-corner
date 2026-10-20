import { useId, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import Button from "../ui/Button";
import { subscribeToNewsletter } from "../../services/newsletter";
import { toShopError } from "../../lib/errors";
import { cx } from "../../utils/cx";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Footer sign-up (collected only; the shop emails new arrivals later). */
function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setError("Enter an email address, like name@example.com.");
      return;
    }
    setError("");
    setState("sending");
    try {
      await subscribeToNewsletter(value);
      setState("done");
    } catch (err) {
      setError(toShopError(err).message);
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-start gap-2 type-body text-linen">
        <CircleCheck
          size={20}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-lamp-glow"
        />
        You&rsquo;re on the list. We&rsquo;ll write when new pieces arrive.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
      <label htmlFor={id} className="type-label text-linen">
        Email address
      </label>
      <div className="mt-1.5 flex flex-col gap-2 xs:flex-row">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(
            "h-12 w-full min-w-0 shrink-0 rounded-control border bg-paper px-4 text-[16px] text-ink placeholder:text-mauve-grey focus:outline-none xs:w-auto xs:flex-1 xs:shrink",
            error
              ? "border-error shadow-[inset_0_0_0_1px_var(--color-error)]"
              : "border-transparent focus:shadow-[inset_0_0_0_2px_var(--color-lamp-glow)]",
          )}
        />
        <Button
          type="submit"
          variant="light"
          loading={state === "sending"}
          loadingLabel="Signing you up"
        >
          Sign up
        </Button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-start gap-1.5 rounded-badge bg-error-bg px-2.5 py-1.5 type-helper text-error!"
        >
          <CircleAlert
            size={16}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {error}
        </p>
      )}
    </form>
  );
}

export default NewsletterForm;
