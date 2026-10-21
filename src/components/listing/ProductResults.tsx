import ProductCard from "../product/ProductCard";
import { ProductCardSkeleton } from "../ui/Skeleton";
import LoadMore from "../ui/LoadMore";
import Notice from "../ui/Notice";
import { Button } from "../ui/Button";
import { toShopError } from "../../lib/errors";
import {
  PAGE_SIZE,
  type ListingFilters,
} from "../../features/catalog/listingState";
import { useCatalogPage, type ListingScope } from "../../services/listing";
import type { ProductCardData } from "../../types/shop";

const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10";

/** One page of 24 cards, rendered straight into the shared grid. */
function PageItems({
  scope,
  filters,
  page,
  total,
  priorityCount,
  onQuickAdd,
}: {
  scope: ListingScope;
  filters: ListingFilters;
  page: number;
  total: number;
  priorityCount: number;
  onQuickAdd: (product: ProductCardData) => void;
}) {
  const { data, error, refetch } = useCatalogPage(
    scope,
    filters,
    page * PAGE_SIZE,
  );
  if (!data) {
    if (error) {
      return (
        <li className="col-span-full">
          <Notice
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {toShopError(error).message}
          </Notice>
        </li>
      );
    }
    const count = Math.max(1, Math.min(PAGE_SIZE, total - page * PAGE_SIZE));
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <li key={`s-${i}`} aria-hidden="true">
            <ProductCardSkeleton />
          </li>
        ))}
      </>
    );
  }
  return (
    <>
      {data.items.map((product, i) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={page === 0 && i < priorityCount}
            onQuickAdd={onQuickAdd}
          />
        </li>
      ))}
    </>
  );
}

/**
 * The product grid with "Load more" (24 at a time, so the footer stays
 * reachable). Each page is cached separately: going back to a listing shows
 * every loaded page at once.
 */
function ProductResults({
  scope,
  filters,
  total,
  priorityCount,
  onQuickAdd,
  onLoadMore,
}: {
  scope: ListingScope;
  filters: ListingFilters;
  total: number;
  priorityCount: number;
  onQuickAdd: (product: ProductCardData) => void;
  onLoadMore: () => void;
}) {
  const pages = Math.max(
    1,
    Math.min(filters.pages, Math.ceil(total / PAGE_SIZE)),
  );
  const last = useCatalogPage(scope, filters, (pages - 1) * PAGE_SIZE);
  const shown = Math.min(total, pages * PAGE_SIZE);

  return (
    <>
      <ul className={GRID}>
        {Array.from({ length: pages }, (_, page) => (
          <PageItems
            key={page}
            scope={scope}
            filters={filters}
            page={page}
            total={total}
            priorityCount={priorityCount}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </ul>
      {total > PAGE_SIZE && (
        <div className="mt-12">
          <LoadMore
            shown={last.data ? shown : (pages - 1) * PAGE_SIZE}
            total={total}
            loading={!last.data && !last.error}
            onLoadMore={onLoadMore}
          />
        </div>
      )}
    </>
  );
}

export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading products</span>
      <ul className={GRID} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductResults;
