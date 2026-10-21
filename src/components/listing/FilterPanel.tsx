import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Checkbox } from "../ui/Choice";
import { Button } from "../ui/Button";
import { controlClasses } from "../ui/fieldStyles";
import { Skeleton } from "../ui/Skeleton";
import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";
import {
  PRICE_RANGES,
  type ListingFilters,
  type ListingKind,
} from "../../features/catalog/listingState";
import type { Facets } from "../../services/listing";

export type FilterPatch = Partial<
  Pick<
    ListingFilters,
    "minPrice" | "maxPrice" | "colors" | "inStock" | "onSale" | "category"
  >
>;

function Group({
  legend,
  children,
  className,
}: {
  legend: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cx(
        "min-w-0 border-b border-sand-line py-5 first:pt-0",
        className,
      )}
    >
      <legend className="float-left mb-2 w-full type-label font-semibold text-ink">
        {legend}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

/** Radio row: the same look as the checkbox rows, a dot instead of a tick. */
function RadioRow({
  name,
  checked,
  onChange,
  children,
  count,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="grid size-5 shrink-0 cursor-pointer appearance-none place-items-center rounded-full border border-mauve-grey bg-paper transition-colors before:size-2.5 before:scale-0 before:rounded-full before:bg-rosewood before:transition-transform before:content-[''] checked:border-rosewood checked:before:scale-100 hover:border-ink/60"
      />
      <span className="flex-1 type-body text-ink">{children}</span>
      {count !== undefined && (
        <span className="type-caption text-soft-ink">{count}</span>
      )}
    </label>
  );
}

function PriceFields({
  filters,
  facets,
  onChange,
}: {
  filters: ListingFilters;
  facets?: Facets;
  onChange: (patch: FilterPatch) => void;
}) {
  const id = useId();
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "");
  const [error, setError] = useState("");

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const lo = min.trim() === "" ? null : Math.round(Number(min));
    const hi = max.trim() === "" ? null : Math.round(Number(max));
    if (
      (lo !== null && (!Number.isFinite(lo) || lo < 0)) ||
      (hi !== null && (!Number.isFinite(hi) || hi < 0))
    ) {
      setError("Enter prices as whole numbers, like 500.");
      return;
    }
    if (lo !== null && hi !== null && lo > hi) {
      setError("The lowest price needs to be below the highest.");
      return;
    }
    setError("");
    onChange({ minPrice: lo, maxPrice: hi });
  };

  return (
    <form onSubmit={apply} noValidate className="mt-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-min`} className="type-label text-ink">
            Min (৳)
          </label>
          <input
            id={`${id}-min`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={facets?.priceMin?.toString() ?? "0"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={controlClasses({
              invalid: Boolean(error),
              className: "mt-1.5 h-11 px-3 figures",
            })}
          />
        </div>
        <span aria-hidden="true" className="pb-3 text-soft-ink">
          –
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-max`} className="type-label text-ink">
            Max (৳)
          </label>
          <input
            id={`${id}-max`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={facets?.priceMax?.toString() ?? ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={controlClasses({
              invalid: Boolean(error),
              className: "mt-1.5 h-11 px-3 figures",
            })}
          />
        </div>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 type-helper text-error!"
        >
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" size="sm" className="mt-3">
        Apply price
      </Button>
    </form>
  );
}

/**
 * Filters (brand doc section 6): category (Shop all, collections, search),
 * price, color, availability and on sale, each with how many products it
 * covers. Every change applies at once and is kept in the address bar.
 */
function FilterPanel({
  kind,
  filters,
  facets,
  facetsLoading,
  onChange,
  className,
}: {
  kind: ListingKind;
  filters: ListingFilters;
  facets?: Facets;
  facetsLoading?: boolean;
  onChange: (patch: FilterPatch) => void;
  className?: string;
}) {
  const name = useId();
  const showCategories =
    kind !== "category" &&
    facets &&
    (facets.categories.length > 1 || filters.category !== null);
  const presetIndex = PRICE_RANGES.findIndex(
    (r) => r.min === filters.minPrice && r.max === filters.maxPrice,
  );
  const anyPrice = filters.minPrice === null && filters.maxPrice === null;

  if (!facets && facetsLoading) {
    return (
      <div aria-hidden="true" className={cx("space-y-4", className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 border-b border-sand-line pb-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {showCategories && (
        <Group legend="Category">
          <RadioRow
            name={`${name}-cat`}
            checked={filters.category === null}
            onChange={() => onChange({ category: null })}
          >
            All categories
          </RadioRow>
          {facets.categories.map((c) => (
            <RadioRow
              key={c.slug}
              name={`${name}-cat`}
              checked={filters.category === c.slug}
              onChange={() => onChange({ category: c.slug })}
              count={c.count}
            >
              {c.name}
            </RadioRow>
          ))}
        </Group>
      )}

      <Group legend="Price">
        {facets?.priceMin != null && facets.priceMax != null && (
          <p className="mb-1 type-caption text-soft-ink">
            Prices here run from{" "}
            <span className="figures">{formatPrice(facets.priceMin)}</span> to{" "}
            <span className="figures">{formatPrice(facets.priceMax)}</span>.
          </p>
        )}
        <RadioRow
          name={`${name}-price`}
          checked={anyPrice}
          onChange={() => onChange({ minPrice: null, maxPrice: null })}
        >
          Any price
        </RadioRow>
        {PRICE_RANGES.map((range, i) => (
          <RadioRow
            key={range.label}
            name={`${name}-price`}
            checked={presetIndex === i}
            onChange={() =>
              onChange({ minPrice: range.min, maxPrice: range.max })
            }
          >
            {range.label}
          </RadioRow>
        ))}
        {/* Re-mounted when a preset or a chip changes the range, so the
            fields always show the range in use. */}
        <PriceFields
          key={`${filters.minPrice}-${filters.maxPrice}`}
          filters={filters}
          facets={facets}
          onChange={onChange}
        />
      </Group>

      {facets && facets.colors.length > 0 && (
        <Group legend="Color">
          <ul>
            {facets.colors.map((color) => {
              const checked = filters.colors.some(
                (c) => c.toLowerCase() === color.value.toLowerCase(),
              );
              return (
                <li key={color.value}>
                  <Checkbox
                    checked={checked}
                    onChange={() =>
                      onChange({
                        colors: checked
                          ? filters.colors.filter(
                              (c) =>
                                c.toLowerCase() !== color.value.toLowerCase(),
                            )
                          : [...filters.colors, color.value],
                      })
                    }
                    label={
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-5 shrink-0 rounded-full border border-ink/15"
                          style={{ backgroundColor: color.hex ?? "#efe7dd" }}
                        />
                        <span className="flex-1">{color.value}</span>
                        <span className="type-caption text-soft-ink">
                          {color.count}
                        </span>
                      </span>
                    }
                    className="py-1.5"
                  />
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      <Group legend="Availability" className="border-b-0 pb-0">
        <Checkbox
          checked={filters.inStock}
          onChange={() => onChange({ inStock: !filters.inStock })}
          label={
            <span className="flex items-center gap-2">
              <span className="flex-1">In stock only</span>
              {facets && (
                <span className="type-caption text-soft-ink">
                  {facets.inStock}
                </span>
              )}
            </span>
          }
          className="py-1.5"
        />
        {(filters.onSale || (facets && facets.onSale > 0)) && (
          <Checkbox
            checked={filters.onSale}
            onChange={() => onChange({ onSale: !filters.onSale })}
            label={
              <span className="flex items-center gap-2">
                <span className="flex-1">On sale</span>
                {facets && (
                  <span className="type-caption text-soft-ink">
                    {facets.onSale}
                  </span>
                )}
              </span>
            }
            className="py-1.5"
          />
        )}
      </Group>
    </div>
  );
}

export default FilterPanel;
