import type { ReactNode } from "react";
import LeafSprig from "../brand/LeafSprig";
import { cx } from "../../utils/cx";

/**
 * Empty states (brand doc section 6): a simple line illustration, one
 * headline, one sentence, one button. Copy for the standard cases lives in
 * emptyStateCopy.ts, word for word from the brand doc.
 */
function EmptyState({
  title,
  children,
  action,
  icon,
  className,
  headingLevel = 2,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Defaults to the leaf sprig line drawing. */
  icon?: ReactNode;
  className?: string;
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cx(
        "mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-24 place-items-center rounded-full bg-clay-blush/60 text-rosewood">
        {icon ?? <LeafSprig className="h-14" strokeWidth={1.5} />}
      </div>
      <Heading className="mt-6 type-h3 text-ink">{title}</Heading>
      {children && <p className="mt-2 type-body text-soft-ink">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
