import { cx } from "../../utils/cx";

/** The brand loader: a small pulsing lamp-glow dot. Never a blank screen. */
function PageLoader({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx("grid min-h-[50vh] place-items-center", className)}
    >
      <span className="block size-3 animate-glow-pulse rounded-full bg-lamp-glow" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default PageLoader;
