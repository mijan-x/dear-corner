import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

/** A white card with an optional heading and actions. */
function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cx("rounded-card border border-sand-line bg-paper", className)}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-line px-5 py-3.5">
          {title && <h2 className="type-h3 text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export default Panel;
