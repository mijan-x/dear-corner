import { Star } from "lucide-react";
import { cx } from "../../utils/cx";

/**
 * Star rating (display only). Shown only when real, approved reviews exist.
 */
function Rating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value * 10) / 10;
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = Array.from({ length: 5 }, (_, i) => i);
  return (
    <p className={cx("inline-flex items-center gap-1.5", className)}>
      <span className="sr-only">
        Rated {rounded} out of 5
        {count !== undefined
          ? `, ${count} ${count === 1 ? "review" : "reviews"}`
          : ""}
      </span>
      <span aria-hidden="true" className="relative inline-flex">
        <span className="flex text-sand-line">
          {stars.map((i) => (
            <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-rosewood"
          style={{ width: `${percent}%` }}
        >
          {stars.map((i) => (
            <Star
              key={i}
              size={size}
              fill="currentColor"
              strokeWidth={0}
              className="shrink-0"
            />
          ))}
        </span>
      </span>
      <span aria-hidden="true" className="type-caption text-soft-ink">
        {rounded.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </span>
    </p>
  );
}

export default Rating;
