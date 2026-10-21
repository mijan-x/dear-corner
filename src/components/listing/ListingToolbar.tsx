import { useId, useState } from "react";
import { ArrowDownUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import Dialog from "../ui/Dialog";
import { Button } from "../ui/Button";
import { controlClasses } from "../ui/fieldStyles";
import FilterPanel, { type FilterPatch } from "./FilterPanel";
import { cx } from "../../utils/cx";
import {
  SEARCH_SORT_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  countText,
  type ListingFilters,
  type ListingKind,
  type SortKey,
} from "../../features/catalog/listingState";
import type { Facets } from "../../services/listing";

/** Desktop: "Sort by" select next to the result count. */
export function SortSelect({
  kind,
  value,
  onChange,
}: {
  kind: ListingKind;
  value: SortKey;
  onChange: (sort: SortKey) => void;
}) {
  const id = useId();
  const options = kind === "search" ? SEARCH_SORT_OPTIONS : SORT_OPTIONS;
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="type-label whitespace-nowrap text-soft-ink"
      >
        Sort by
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as SortKey)}
          className={controlClasses({
            className:
              "h-11 cursor-pointer appearance-none pr-10 pl-3.5 type-nav",
          })}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-soft-ink"
        />
      </div>
    </div>
  );
}

/**
 * Below 1024px: a bar that sticks under the header with Filter and Sort,
 * each opening a bottom sheet. Filters apply as they're picked; the sheet's
 * button shows how many products match.
 */
export function MobileToolbar({
  kind,
  filters,
  facets,
  facetsLoading,
  total,
  onChange,
  onSort,
  onClear,
}: {
  kind: ListingKind;
  filters: ListingFilters;
  facets?: Facets;
  facetsLoading?: boolean;
  total?: number;
  onChange: (patch: FilterPatch) => void;
  onSort: (sort: SortKey) => void;
  onClear: () => void;
}) {
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const active = activeFilterCount(filters);
  const options = kind === "search" ? SEARCH_SORT_OPTIONS : SORT_OPTIONS;
  const sortLabel =
    options.find((o) => o.value === filters.sort)?.label ?? "Featured";
  const radioName = useId();

  const barButton =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-sand-line bg-paper type-nav text-ink transition-colors hover:border-rosewood hover:text-rosewood";

  return (
    <>
      <div className="sticky top-14 z-30 -mx-[var(--gutter)] border-b border-sand-line bg-linen/95 px-[var(--gutter)] py-2 backdrop-blur-sm lg:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            className={barButton}
            onClick={() => setSheet("filter")}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            Filter
            {active > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rosewood px-1.5 text-[12px] leading-none font-bold text-white">
                {active}
                <span className="sr-only"> in use</span>
              </span>
            )}
          </button>
          <button
            type="button"
            className={barButton}
            onClick={() => setSheet("sort")}
            aria-haspopup="dialog"
          >
            <ArrowDownUp size={18} aria-hidden="true" />
            <span className="truncate">
              Sort<span className="sr-only">ed by</span>
              <span aria-hidden="true">:</span> {sortLabel}
            </span>
          </button>
        </div>
      </div>

      <Dialog
        open={sheet === "filter"}
        onClose={() => setSheet(null)}
        variant="sheet"
        title="Filter"
        bodyClassName="px-5 py-5"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClear}
              disabled={active === 0}
              className="flex-1"
            >
              Clear all
            </Button>
            <Button onClick={() => setSheet(null)} className="flex-[1.6]">
              {total === undefined
                ? "Show products"
                : total === 0
                  ? "No products match"
                  : `Show ${countText(total)}`}
            </Button>
          </div>
        }
      >
        <FilterPanel
          kind={kind}
          filters={filters}
          facets={facets}
          facetsLoading={facetsLoading}
          onChange={onChange}
        />
      </Dialog>

      <Dialog
        open={sheet === "sort"}
        onClose={() => setSheet(null)}
        variant="sheet"
        title="Sort by"
        bodyClassName="px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <fieldset>
          <legend className="sr-only">Sort products by</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-sand-line last:border-b-0"
            >
              <input
                type="radio"
                name={radioName}
                checked={filters.sort === option.value}
                onChange={() => {
                  onSort(option.value);
                  setSheet(null);
                }}
                className="grid size-5 shrink-0 cursor-pointer appearance-none place-items-center rounded-full border border-mauve-grey bg-paper before:size-2.5 before:scale-0 before:rounded-full before:bg-rosewood before:transition-transform before:content-[''] checked:border-rosewood checked:before:scale-100"
              />
              <span
                className={cx(
                  "type-body",
                  filters.sort === option.value
                    ? "font-semibold text-ink"
                    : "text-ink",
                )}
              >
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
      </Dialog>
    </>
  );
}
