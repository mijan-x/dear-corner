import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "../../utils/cx";

/**
 * Collapsible section on the native <details> element: works without
 * JavaScript, keyboard and screen readers get it for free. Opening animates
 * where the browser supports it (see .dc-details in index.css).
 */
function Accordion({
  title,
  children,
  defaultOpen,
  name,
  className,
  tone = "light",
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Same name on several = only one open at a time. */
  name?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <details
      name={name}
      open={defaultOpen}
      className={cx(
        "dc-details group border-b",
        tone === "dark" ? "border-linen/15" : "border-sand-line",
        className,
      )}
    >
      <summary
        className={cx(
          "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden",
          tone === "dark" ? "text-linen" : "text-ink",
        )}
      >
        <span>{title}</span>
        <ChevronDown
          size={20}
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

export default Accordion;
