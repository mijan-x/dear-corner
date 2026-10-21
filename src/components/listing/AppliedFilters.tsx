import { FilterChip } from "../ui/Chip";
import {
  activeFilterCount,
  priceLabel,
  type ListingFilters,
} from "../../features/catalog/listingState";
import type { FilterPatch } from "./FilterPanel";

/** The filters in use as removable chips, plus "Clear all". */
function AppliedFilters({
  filters,
  categoryName,
  onChange,
  onClear,
}: {
  filters: ListingFilters;
  /** Display name of the category filter. */
  categoryName?: string;
  onChange: (patch: FilterPatch) => void;
  onClear: () => void;
}) {
  if (activeFilterCount(filters) === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="sr-only">Filters in use</h2>
      {filters.category && (
        <FilterChip
          onRemove={() => onChange({ category: null })}
          removeLabel={`Remove filter: ${categoryName ?? filters.category}`}
        >
          {categoryName ?? filters.category}
        </FilterChip>
      )}
      {(filters.minPrice !== null || filters.maxPrice !== null) && (
        <FilterChip
          onRemove={() => onChange({ minPrice: null, maxPrice: null })}
          removeLabel={`Remove filter: ${priceLabel(filters.minPrice, filters.maxPrice)}`}
        >
          {priceLabel(filters.minPrice, filters.maxPrice)}
        </FilterChip>
      )}
      {filters.colors.map((color) => (
        <FilterChip
          key={color}
          onRemove={() =>
            onChange({ colors: filters.colors.filter((c) => c !== color) })
          }
          removeLabel={`Remove filter: ${color}`}
        >
          {color}
        </FilterChip>
      ))}
      {filters.inStock && (
        <FilterChip
          onRemove={() => onChange({ inStock: false })}
          removeLabel="Remove filter: In stock only"
        >
          In stock only
        </FilterChip>
      )}
      {filters.onSale && (
        <FilterChip
          onRemove={() => onChange({ onSale: false })}
          removeLabel="Remove filter: On sale"
        >
          On sale
        </FilterChip>
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 inline-flex min-h-11 items-center px-1 type-nav link"
      >
        Clear all
      </button>
    </div>
  );
}

export default AppliedFilters;
