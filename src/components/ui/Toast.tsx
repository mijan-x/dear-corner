import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cx } from "../../utils/cx";

import { ToastContext, type ToastTone } from "./toastContext";

type ToastItem = { id: number; tone: ToastTone; message: string };

const DURATION_MS = 4000;

const icons: Record<ToastTone, ReactNode> = {
  success: (
    <CircleCheck size={20} aria-hidden="true" className="text-success" />
  ),
  error: <CircleAlert size={20} aria-hidden="true" className="text-error" />,
  info: <Info size={20} aria-hidden="true" className="text-info" />,
};

/**
 * Toasts (brand doc section 6): bottom-center on phones (above the bottom
 * navigation), top-right on desktop, 4 seconds, announced politely. The
 * stack sits in the top layer (a manual popover), so it shows above open
 * drawers as well.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const layerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
    setAnnouncement(message);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, DURATION_MS);
  }, []);

  // Keep the stack above any dialog opened after it.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || toasts.length === 0 || !("showPopover" in layer)) return;
    try {
      if (layer.matches(":popover-open")) layer.hidePopover();
      layer.showPopover();
    } catch {
      // Popover unsupported: the stack still shows with a high z-index.
    }
  }, [toasts]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={layerRef}
        popover="manual"
        className="pointer-events-none fixed inset-x-0 top-auto bottom-[calc(56px+16px+env(safe-area-inset-bottom))] z-[60] m-0 flex w-full flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-4 md:bottom-6 lg:inset-x-auto lg:top-[88px] lg:right-8 lg:bottom-auto lg:w-auto lg:items-end [&:not(:popover-open)]:flex"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            aria-hidden="true"
            className={cx(
              "pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-control border border-sand-line bg-paper px-4 py-3 text-ink shadow-drawer",
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[toast.tone]}</span>
            <p className="type-body">{toast.message}</p>
          </div>
        ))}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </ToastContext.Provider>
  );
}
