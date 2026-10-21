import {
  CircleCheck,
  CircleX,
  Clock,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { orderStatusLabel, type OrderStatus } from "../../services/orders";
import { cx } from "../../utils/cx";

const looks: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  placed: { icon: Clock, className: "bg-info-bg text-info" },
  confirmed: { icon: CircleCheck, className: "bg-info-bg text-info" },
  packed: { icon: Package, className: "bg-clay-blush text-rosewood" },
  handed_to_courier: { icon: Truck, className: "bg-clay-blush text-rosewood" },
  out_for_delivery: { icon: Truck, className: "bg-lamp-glow/60 text-ink" },
  delivered: { icon: PackageCheck, className: "bg-success-bg text-success" },
  cancelled: { icon: CircleX, className: "bg-soft-sand text-soft-ink" },
  returned: { icon: RotateCcw, className: "bg-soft-sand text-soft-ink" },
};

/** Order status as an icon and words (never color alone). */
function StatusChip({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const look = looks[status] ?? looks.placed;
  const Icon = look.icon;
  return (
    <span
      className={cx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] leading-none font-semibold whitespace-nowrap",
        look.className,
        className,
      )}
    >
      <Icon size={15} aria-hidden="true" />
      {orderStatusLabel[status] ?? status}
    </span>
  );
}

export default StatusChip;
