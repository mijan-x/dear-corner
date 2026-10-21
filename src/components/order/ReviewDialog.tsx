import { useState, type FormEvent } from "react";
import { CircleCheck, Star } from "lucide-react";
import Dialog from "../ui/Dialog";
import { Button } from "../ui/Button";
import Notice from "../ui/Notice";
import { TextAreaField, TextField } from "../ui/Field";
import { toShopError } from "../../lib/errors";
import { submitReview, type OrderItem } from "../../services/orders";
import { cx } from "../../utils/cx";

const WORDS = ["", "Not for me", "It's okay", "Good", "Really nice", "Love it"];

/** 1 to 5 stars as a radio group: arrow keys move, the number is read out. */
function StarInput({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset aria-describedby={error ? "review-rating-error" : undefined}>
      <legend className="type-label text-ink">Your rating</legend>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="group grid size-11 cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-rosewood"
            >
              <input
                type="radio"
                name="review-rating"
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <Star
                size={30}
                aria-hidden="true"
                className={cx(
                  "transition-transform duration-150 group-hover:scale-110",
                  n <= shown
                    ? "fill-lamp-glow text-terracotta-deep"
                    : "fill-transparent text-mauve-grey",
                )}
              />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}, {WORDS[n]}
              </span>
            </label>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="type-body font-medium text-soft-ink"
        >
          {WORDS[shown]}
        </span>
      </div>
      {error && (
        <p id="review-rating-error" className="mt-1 type-helper text-error!">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Review an item from a delivered order. Reviews are checked by the shop
 * before they appear on the product page.
 */
function ReviewDialog({
  item,
  open,
  onClose,
  onDone,
  defaultName,
  proof,
}: {
  item: OrderItem | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  defaultName: string;
  /** Guests prove the order with its number and phone. */
  proof?: { orderNumber: string; phone: string };
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName.split(/\s+/)[0] ?? "");
  const [errors, setErrors] = useState<{ rating?: string; body?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;
    const found = {
      rating: rating ? undefined : "Choose a rating from 1 to 5 stars.",
      body: body.trim() ? undefined : "Tell us a little about it.",
    };
    setErrors(found);
    if (found.rating || found.body) return;
    setBusy(true);
    setError(null);
    try {
      await submitReview({
        orderItemId: item.id,
        rating,
        body: body.trim(),
        title: title.trim(),
        displayName: name.trim(),
        orderNumber: proof?.orderNumber,
        phone: proof?.phone,
      });
      setSent(true);
      onDone();
    } catch (e) {
      setError(toShopError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="modal"
      title={sent ? "Thank you!" : "Write a review"}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      {sent ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CircleCheck size={44} aria-hidden="true" className="text-success" />
          <p className="mt-4 type-body-lg text-ink">
            Your review is with us. We&rsquo;ll publish it after a quick check.
          </p>
          <Button className="mt-6" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {item && (
            <p className="type-body text-soft-ink">
              <span className="font-semibold text-ink">{item.productName}</span>
              {item.variantTitle && item.variantTitle !== "Default" && (
                <> · {item.variantTitle}</>
              )}
            </p>
          )}
          <StarInput
            value={rating}
            onChange={setRating}
            error={errors.rating}
          />
          <TextField
            label="Title"
            optional
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="For example: Cosy light for my desk"
          />
          <TextAreaField
            label="Your review"
            maxLength={2000}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            error={errors.body}
            helper="What did you like? How do you use it?"
          />
          <TextField
            label="Name to show"
            maxLength={30}
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helper="Only your first name is shown with the review."
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            fullWidth
            loading={busy}
            loadingLabel="Sending your review"
          >
            Send review
          </Button>
        </form>
      )}
    </Dialog>
  );
}

export default ReviewDialog;
