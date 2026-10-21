import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { IconButton } from "../ui/IconButton";
import { ProductCardSkeleton } from "../ui/Skeleton";
import { cx } from "../../utils/cx";
import type { ProductCardData } from "../../types/shop";

const ITEM =
  "w-[calc((100%-2*12px)/2.3)] shrink-0 md:w-[calc((100%-2*24px)/3.3)] lg:w-[calc((100%-3*24px)/4)]";

export function RowArrows({
  edges,
  scrollBy,
  label,
}: {
  edges: { start: boolean; end: boolean };
  scrollBy: (direction: 1 | -1) => void;
  label: string;
}) {
  if (edges.start && edges.end) return null;
  return (
    <div className="hidden items-center gap-1 lg:flex">
      <IconButton
        label={`Previous ${label}`}
        icon={<ChevronLeft aria-hidden="true" />}
        onClick={() => scrollBy(-1)}
        disabled={edges.start}
        className="rounded-full border border-sand-line bg-paper disabled:opacity-40"
      />
      <IconButton
        label={`More ${label}`}
        icon={<ChevronRight aria-hidden="true" />}
        onClick={() => scrollBy(1)}
        disabled={edges.end}
        className="rounded-full border border-sand-line bg-paper disabled:opacity-40"
      />
    </div>
  );
}

/**
 * A horizontal row of product cards: 2.3 visible on phones (the cut-off
 * card shows there's more), 3.3 on tablets, 4 on desktop with arrow
 * buttons. Native scrolling with snap points, so it never fights the
 * finger and the page keeps scrolling vertically.
 */
function ProductRow({
  products,
  loading,
  onQuickAdd,
  listRef,
  label,
  className,
}: {
  products: ProductCardData[];
  loading?: boolean;
  onQuickAdd?: (product: ProductCardData) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  /** "New arrivals": names the list for screen readers. */
  label: string;
  className?: string;
}) {
  return (
    <ul
      ref={listRef}
      aria-label={label}
      className={cx(
        "dc-scroller -mx-[var(--gutter)] flex gap-3 overflow-x-auto px-[var(--gutter)] pb-2 md:gap-6",
        className,
      )}
    >
      {loading && products.length === 0
        ? Array.from({ length: 4 }, (_, i) => (
            <li key={i} className={ITEM} aria-hidden="true">
              <ProductCardSkeleton />
            </li>
          ))
        : products.map((product) => (
            <li key={product.id} className={ITEM}>
              <ProductCard product={product} onQuickAdd={onQuickAdd} />
            </li>
          ))}
    </ul>
  );
}

export default ProductRow;
