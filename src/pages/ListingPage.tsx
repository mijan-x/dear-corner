import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import ListingHeader from "../components/listing/ListingHeader";
import FilterPanel, {
  type FilterPatch,
} from "../components/listing/FilterPanel";
import AppliedFilters from "../components/listing/AppliedFilters";
import {
  MobileToolbar,
  SortSelect,
} from "../components/listing/ListingToolbar";
import ProductResults, {
  ResultsSkeleton,
} from "../components/listing/ProductResults";
import SearchForm from "../components/listing/SearchForm";
import EmptyState from "../components/ui/EmptyState";
import Notice from "../components/ui/Notice";
import { Button, ButtonLink } from "../components/ui/Button";
import { ChipLink } from "../components/ui/Chip";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import type { Crumb } from "../components/ui/Breadcrumbs";
import { useQuickAdd } from "../features/cart/useAddToCart";
import {
  activeFilterCount,
  countText,
  readFilters,
  writeFilters,
  type ListingFilters,
  type ListingKind,
  type SortKey,
} from "../features/catalog/listingState";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import { useStorefrontNav } from "../services/catalog";
import {
  listingScope,
  useCatalogPage,
  useFacets,
  useListingHeader,
} from "../services/listing";

const SHOP_INTRO =
  "Room decor, lamps, desk picks, accessories and gifts, all in one place.";

/**
 * Shop all, category, collection and search results share this page
 * (brand doc section 6): header with banner and sub-category chips, a 260px
 * filter column on desktop, Filter and Sort sheets on phones, five sorts
 * (plus Best match for search) and "Load more" with 24 products a time.
 * Filters, sort and loaded pages live in the address bar.
 */
function ListingPage({ kind }: { kind: ListingKind }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params, kind), [params, kind]);
  const nav = useStorefrontNav();
  const header = useListingHeader(kind, slug);
  const quickAdd = useQuickAdd();

  const hasHeader = kind === "category" || kind === "collection";
  const notFound = hasHeader && header.data === null;
  const searchEmpty = kind === "search" && !filters.query;
  const enabled = !notFound && !searchEmpty;
  const scope = listingScope(kind, slug, filters);
  const facets = useFacets(scope, enabled);
  const first = useCatalogPage(scope, filters, 0, enabled);
  const total = first.data?.total;

  const update = (next: ListingFilters, replace = false) =>
    setParams(writeFilters(next, kind), { replace, preventScrollReset: true });
  const onChange = (patch: FilterPatch) =>
    update({ ...filters, ...patch, pages: 1 });
  const onSort = (sort: SortKey) => update({ ...filters, sort, pages: 1 });
  const onClear = () =>
    update({
      ...filters,
      minPrice: null,
      maxPrice: null,
      colors: [],
      inStock: false,
      onSale: false,
      category: null,
      pages: 1,
    });
  const onLoadMore = () =>
    update({ ...filters, pages: filters.pages + 1 }, true);

  // Header text and breadcrumbs for each kind of listing.
  const h = header.data ?? undefined;
  const main = h?.parent ?? (h ? { slug: h.slug, name: h.name } : null);
  let title: string;
  let intro: string | undefined;
  let crumbs: Crumb[];
  let chips: { to: string; label: string }[] | undefined;
  if (kind === "shop") {
    title = "Shop all";
    intro = SHOP_INTRO;
    crumbs = [{ label: "Home", to: routes.home }, { label: "Shop all" }];
    chips = [
      { to: routes.shop, label: "All" },
      ...nav.collections.map((c) => ({
        to: routes.collection(c.slug),
        label: c.name,
      })),
      ...nav.categories.map((c) => ({
        to: routes.category(c.slug),
        label: c.name,
      })),
    ];
  } else if (kind === "search") {
    const q = filters.query;
    title = !q
      ? "Search"
      : total === undefined
        ? `Searching for ‘${q}’`
        : `${total} ${total === 1 ? "result" : "results"} for ‘${q}’`;
    crumbs = [{ label: "Home", to: routes.home }, { label: "Search" }];
  } else {
    // If the header can't load, the address still names the page.
    title =
      h?.name ??
      (header.error && slug
        ? slug
            .replace(/^sample-/, "")
            .replace(/-/g, " ")
            .replace(/^./, (c) => c.toUpperCase())
        : "");
    intro = h ? h.intro || undefined : undefined;
    crumbs = [
      { label: "Home", to: routes.home },
      { label: "Shop", to: routes.shop },
      ...(h?.parent
        ? [{ label: h.parent.name, to: routes.category(h.parent.slug) }]
        : []),
      { label: h?.name ?? "…" },
    ];
    if (kind === "category" && main && h && h.children.length > 0) {
      chips = [
        { to: routes.category(main.slug), label: `All ${main.name}` },
        ...h.children.map((c) => ({
          to: routes.category(c.slug),
          label: c.name,
        })),
      ];
    }
  }

  usePageMeta({
    title: notFound
      ? "Not found"
      : kind === "search"
        ? filters.query
          ? `Search: ${filters.query}`
          : "Search"
        : (h?.seoTitle ?? (title || undefined)),
    description:
      h?.seoDescription ??
      (h?.intro || (kind === "shop" ? SHOP_INTRO : undefined)),
    noindex: kind === "search" || notFound,
  });

  if (notFound) {
    return (
      <div className="container-page">
        <EmptyState
          headingLevel={1}
          title={emptyCopy.notFound.title}
          action={<ButtonLink to={routes.shop}>Back to the shop</ButtonLink>}
          className="py-20"
        >
          {emptyCopy.notFound.body}
        </EmptyState>
      </div>
    );
  }

  const categoryName = filters.category
    ? (facets.data?.categories.find((c) => c.slug === filters.category)?.name ??
      nav.categories.find((c) => c.slug === filters.category)?.name)
    : undefined;
  const filtered = activeFilterCount(filters) > 0;

  const popular = (
    <nav aria-label="Popular categories" className="mt-2">
      <ul className="flex flex-wrap justify-center gap-2">
        {[
          ...nav.collections.map((c) => ({
            to: routes.collection(c.slug),
            name: c.name,
          })),
          ...nav.categories.map((c) => ({
            to: routes.category(c.slug),
            name: c.name,
          })),
        ].map((item) => (
          <li key={item.to}>
            <ChipLink to={item.to}>{item.name}</ChipLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  let results;
  if (!first.data) {
    results = first.error ? (
      <Notice
        tone="error"
        action={
          <Button variant="secondary" size="sm" onClick={first.refetch}>
            Try again
          </Button>
        }
      >
        {toShopError(first.error).message}
      </Notice>
    ) : (
      <ResultsSkeleton />
    );
  } else if (first.data.total === 0) {
    results =
      kind === "search" && !filtered ? (
        <div>
          <EmptyState title={emptyCopy.search(filters.query).title}>
            {emptyCopy.search(filters.query).body}
          </EmptyState>
          {popular}
        </div>
      ) : filtered ? (
        <EmptyState
          title="Nothing matches these filters."
          action={
            <Button variant="secondary" onClick={onClear}>
              Clear all filters
            </Button>
          }
        >
          Try removing a filter or two.
        </EmptyState>
      ) : (
        <EmptyState
          title="Nothing here yet."
          action={<ButtonLink to={routes.shop}>Shop all</ButtonLink>}
        >
          New pieces are on their way. Have a look around the rest of the shop.
        </EmptyState>
      );
  } else {
    results = (
      <ProductResults
        scope={scope}
        filters={filters}
        total={first.data.total}
        priorityCount={h?.bannerDesktop || h?.bannerMobile ? 0 : 2}
        onQuickAdd={quickAdd}
        onLoadMore={onLoadMore}
      />
    );
  }

  return (
    <div className="container-page pb-16 lg:pb-24">
      <ListingHeader
        crumbs={crumbs}
        title={title}
        intro={intro}
        bannerDesktop={h?.bannerDesktop}
        bannerMobile={h?.bannerMobile}
        chips={chips}
        loading={hasHeader && !h && !header.error}
      >
        {kind === "search" && (
          <SearchForm key={filters.query} query={filters.query} />
        )}
      </ListingHeader>

      {searchEmpty ? (
        <div className="mt-10">
          <h2 className="type-label text-soft-ink">Popular categories</h2>
          <div className="[&_ul]:justify-start">{popular}</div>
        </div>
      ) : (
        <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <aside aria-labelledby="filters-title" className="hidden lg:block">
            <div className="sticky top-[84px] max-h-[calc(100dvh-100px)] overflow-y-auto pr-3 pb-8">
              <h2 id="filters-title" className="mb-5 type-h3 text-ink">
                Filter
              </h2>
              <FilterPanel
                kind={kind}
                filters={filters}
                facets={facets.data}
                facetsLoading={facets.loading}
                onChange={onChange}
              />
            </div>
          </aside>

          <section aria-label="Products" className="min-w-0">
            <MobileToolbar
              kind={kind}
              filters={filters}
              facets={facets.data}
              facetsLoading={facets.loading}
              total={total}
              onChange={onChange}
              onSort={onSort}
              onClear={onClear}
            />
            <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 lg:mt-0">
              <p aria-live="polite" className="type-body text-soft-ink">
                {countText(total)}
              </p>
              <div className="hidden lg:block">
                <SortSelect
                  kind={kind}
                  value={filters.sort}
                  onChange={onSort}
                />
              </div>
            </div>
            <div className="mt-3 empty:hidden">
              <AppliedFilters
                filters={filters}
                categoryName={categoryName}
                onChange={onChange}
                onClear={onClear}
              />
            </div>
            <div className="mt-6">{results}</div>
          </section>
        </div>
      )}

      {h?.description && (
        <section
          aria-labelledby="listing-about"
          className="mt-16 max-w-3xl border-t border-sand-line pt-10"
        >
          <h2 id="listing-about" className="type-h3 text-ink">
            About {h.name}
          </h2>
          <p className="mt-3 type-body whitespace-pre-line text-soft-ink">
            {h.description}
          </p>
        </section>
      )}
    </div>
  );
}

export default ListingPage;
