import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import { cx } from "../../utils/cx";

export type DialogVariant =
  | "left" // menu drawer: 85% wide, from the left
  | "right" // 420px panel from the right
  | "sheet" // bottom sheet, top corners rounded
  | "cart" // bottom sheet (90% high) on phones, right panel from 768px
  | "modal" // centered
  | "search"; // full screen on phones, a panel under the header on desktop

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Names the dialog; shown in the header unless `hideTitle`. */
  title: ReactNode;
  hideTitle?: boolean;
  /** Replaces the default header (title + close button). */
  header?: ReactNode;
  variant?: DialogVariant;
  children: ReactNode;
  /** Sticky bottom area (totals, primary button). */
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

let openCount = 0;

/**
 * All overlays use the native <dialog> element: focus stays inside while it
 * is open, Esc closes it, focus returns to the button that opened it, and the
 * page behind is inert. Clicking the dimmed backdrop closes it too. The page
 * doesn't scroll behind it and doesn't shift (scrollbar space is reserved).
 */
function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  header,
  variant = "modal",
  children,
  footer,
  className,
  bodyClassName,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      openCount += 1;
      document.documentElement.classList.add("dc-scroll-locked");
      return () => {
        // Runs when `open` turns false or the dialog unmounts.
        if (dialog.open) dialog.close();
        openCount = Math.max(0, openCount - 1);
        if (openCount === 0) {
          document.documentElement.classList.remove("dc-scroll-locked");
        }
      };
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx("dc-dialog", `dc-dialog--${variant}`, className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full max-h-[inherit] min-h-0 flex-col">
        {header ?? (
          <div
            className={cx(
              "flex shrink-0 items-center justify-between gap-3 border-b border-sand-line py-2 pr-2 pl-5",
              hideTitle && "border-b-0",
            )}
          >
            <h2
              id={titleId}
              className={cx("type-h3 text-ink", hideTitle && "sr-only")}
            >
              {title}
            </h2>
            <IconButton
              label="Close"
              icon={<X aria-hidden="true" />}
              onClick={onClose}
              className="ml-auto"
            />
          </div>
        )}
        {header && (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        <div
          className={cx(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-sand-line bg-paper px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

export default Dialog;
