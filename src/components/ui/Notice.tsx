import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "../../utils/cx";

type Tone = "success" | "warning" | "error" | "info";

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  success: {
    box: "bg-success-bg text-success",
    icon: <CircleCheck size={20} aria-hidden="true" />,
  },
  warning: {
    box: "bg-warning-bg text-warning border-l-[3px] border-lamp-glow",
    icon: <TriangleAlert size={20} aria-hidden="true" />,
  },
  error: {
    box: "bg-error-bg text-error",
    icon: <CircleAlert size={20} aria-hidden="true" />,
  },
  info: {
    box: "bg-info-bg text-info",
    icon: <Info size={20} aria-hidden="true" />,
  },
};

/**
 * Inline message with an icon (never color alone). Errors are announced
 * right away; the others politely.
 */
function Notice({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-control px-4 py-3", t.box, className)}
    >
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="min-w-0 flex-1 type-body">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export default Notice;
