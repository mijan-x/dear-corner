import { cx } from "../../utils/cx";

/** Soft sand block with a subtle 1.2s shimmer (static with reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block skeleton rounded-badge", className)}
    />
  );
}

/** Placeholder with the exact shape of a product card, so nothing jumps. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <Skeleton className="aspect-square w-full rounded-card" />
      <Skeleton className="mt-3 h-4 w-11/12" />
      <Skeleton className="mt-2 h-4 w-7/12" />
      <Skeleton className="mt-3 h-5 w-16" />
    </div>
  );
}

/** A grid of card skeletons with one status message for screen readers. */
export function ProductGridSkeleton({
  count = 8,
  label = "Loading products",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
