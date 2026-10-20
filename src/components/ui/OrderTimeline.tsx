import { Check, CircleX, RotateCcw } from "lucide-react";
import { formatDateTime } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

export type TimelineStep = {
  label: string;
  done: boolean;
  current: boolean;
  at?: string | null;
};

export type ClosedState = {
  status: "cancelled" | "returned";
  label: string;
  at?: string | null;
  note?: string | null;
};

/**
 * Order status timeline (brand doc page 9): Placed, Confirmed, Packed, Handed
 * to courier, Out for delivery, Delivered. Done steps rosewood with a check;
 * the current step a lamp glow ring with an ink outline and a "Now" label.
 * Cancelled and Returned are shown as their own state below.
 */
function OrderTimeline({
  steps,
  closed,
  className,
}: {
  steps: TimelineStep[];
  closed?: ClosedState | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <ol className="relative">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const nextDone = steps[index + 1]?.done ?? false;
          return (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {!last && (
                <span
                  aria-hidden="true"
                  className={cx(
                    "absolute top-7 bottom-1 left-[11px] w-0.5 rounded-full",
                    step.done && nextDone ? "bg-rosewood" : "bg-sand-line",
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className="relative z-10 mt-0.5 shrink-0"
              >
                {step.current ? (
                  <span className="grid size-6 place-items-center rounded-full bg-paper shadow-[0_0_0_3px_var(--color-lamp-glow),0_0_0_4px_var(--color-ink)]">
                    <span className="size-2 rounded-full bg-ink" />
                  </span>
                ) : step.done ? (
                  <span className="grid size-6 place-items-center rounded-full bg-rosewood text-white">
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      absoluteStrokeWidth={false}
                    />
                  </span>
                ) : (
                  <span className="block size-6 rounded-full border-2 border-sand-line bg-paper" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cx(
                    "flex flex-wrap items-center gap-2 type-body",
                    step.done || step.current
                      ? "font-semibold text-ink"
                      : "text-soft-ink",
                  )}
                >
                  {step.label}
                  {step.current && (
                    <span className="rounded-[6px_6px_6px_0] bg-lamp-glow px-1.5 py-px type-badge text-ink">
                      Now
                    </span>
                  )}
                  <span className="sr-only">
                    {step.current
                      ? "(current step)"
                      : step.done
                        ? "(done)"
                        : "(to come)"}
                  </span>
                </p>
                {step.at && (
                  <p className="type-caption text-soft-ink">
                    <time dateTime={step.at}>{formatDateTime(step.at)}</time>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {closed && (
        <div className="mt-6 flex gap-3 rounded-control border border-sand-line bg-soft-sand/60 px-4 py-3">
          {closed.status === "cancelled" ? (
            <CircleX
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-soft-ink"
            />
          ) : (
            <RotateCcw
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-soft-ink"
            />
          )}
          <div>
            <p className="font-semibold text-ink">{closed.label}</p>
            {closed.at && (
              <p className="type-caption text-soft-ink">
                <time dateTime={closed.at}>{formatDateTime(closed.at)}</time>
              </p>
            )}
            {closed.note && (
              <p className="mt-1 type-body text-ink">{closed.note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTimeline;
