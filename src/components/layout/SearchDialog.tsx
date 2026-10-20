import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import Dialog from "../ui/Dialog";
import { IconButton } from "../ui/IconButton";
import { Skeleton } from "../ui/Skeleton";
import { emptyCopy } from "../ui/emptyStateCopy";
import Price from "../ui/Price";
import { recentSearches } from "../../features/search/recentSearches";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../lib/query";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import {
  fetchSearchSuggestions,
  useStorefrontNav,
} from "../../services/catalog";

/**
 * Search (brand doc section 6): full screen on phones, a panel on desktop.
 * While typing: up to 5 products with thumbnails and 3 categories. Before
 * typing: recent searches and popular categories. Enter opens the results.
 */
function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 200);
  const active = debounced.length >= 2;
  const suggestions = useQuery(
    active ? `search:${debounced.toLowerCase()}` : null,
    () => fetchSearchSuggestions(debounced),
    { staleMs: 60_000 },
  );
  const recent = recentSearches.useList();
  const nav = useStorefrontNav();

  const close = () => {
    onClose();
    setQuery("");
  };

  const go = (text: string) => {
    const q = text.trim();
    if (!q) return;
    recentSearches.add(q);
    navigate(routes.search(q));
    close();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    go(query);
  };

  const data = suggestions.data;
  const noResults =
    active &&
    data &&
    data.products.length === 0 &&
    data.categories.length === 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="search"
      title="Search the shop"
      header={
        <div className="shrink-0 border-b border-sand-line">
          <form
            role="search"
            onSubmit={onSubmit}
            className="container-page flex max-w-[calc(760px+2*var(--gutter))] items-center gap-2 py-3"
          >
            <label htmlFor="site-search" className="sr-only">
              Search
            </label>
            <div className="relative flex-1">
              <Search
                size={20}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft-ink"
              />
              <input
                ref={inputRef}
                id="site-search"
                type="search"
                autoFocus
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search lamps, desk picks, gifts"
                className={`h-11 w-full rounded-control border border-mauve-grey bg-paper pl-10 text-[16px] placeholder:text-[15px] ${query ? "pr-11" : "pr-3"} text-ink placeholder:text-mauve-grey focus:border-rosewood focus:shadow-[inset_0_0_0_1px_var(--color-rosewood)] focus:outline-none [&::-webkit-search-cancel-button]:hidden`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center text-soft-ink hover:text-rosewood"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>
            <IconButton
              label="Close search"
              icon={<X aria-hidden="true" />}
              onClick={close}
            />
          </form>
        </div>
      }
    >
      <div className="container-page max-w-[calc(760px+2*var(--gutter))] py-5 pb-10">
        {!active ? (
          <div className="space-y-8">
            {recent.length > 0 && (
              <section aria-labelledby="recent-searches">
                <div className="flex items-center justify-between">
                  <h3 id="recent-searches" className="type-label text-soft-ink">
                    Recent searches
                  </h3>
                  <button
                    type="button"
                    onClick={() => recentSearches.clear()}
                    className="min-h-11 type-caption link"
                  >
                    Clear
                  </button>
                </div>
                <ul className="mt-1">
                  {recent.map((item) => (
                    <li key={item} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => go(item)}
                        className="flex min-h-11 flex-1 items-center gap-3 text-left type-body text-ink hover:text-rosewood"
                      >
                        <Clock
                          size={18}
                          aria-hidden="true"
                          className="text-mauve-grey"
                        />
                        {item}
                      </button>
                      <IconButton
                        label={`Remove "${item}" from recent searches`}
                        icon={<X size={16} aria-hidden="true" />}
                        onClick={() => recentSearches.remove(item)}
                        className="text-soft-ink"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <PopularCategories nav={nav} onPick={close} />
          </div>
        ) : noResults ? (
          <div className="space-y-8">
            <div>
              <p className="type-h3 text-ink">
                {emptyCopy.search(debounced).title}
              </p>
              <p className="mt-1 type-body text-soft-ink">
                {emptyCopy.search(debounced).body}
              </p>
            </div>
            <PopularCategories nav={nav} onPick={close} />
          </div>
        ) : (
          <div
            className="space-y-7"
            aria-live="polite"
            aria-busy={suggestions.loading}
          >
            <section aria-labelledby="search-products">
              <h3 id="search-products" className="type-label text-soft-ink">
                Products
              </h3>
              {!data && suggestions.error ? (
                <p className="mt-3 type-body text-soft-ink">
                  Suggestions aren&rsquo;t available right now. Press Enter to
                  see all results.
                </p>
              ) : !data ? (
                <ul className="mt-3 space-y-3" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Skeleton className="size-12 rounded-control" />
                      <Skeleton className="h-4 w-1/2" />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2">
                  {data.products.map((product) => {
                    const thumb = imageUrl(product.image?.thumb);
                    return (
                      <li key={product.slug}>
                        <Link
                          to={routes.product(product.slug)}
                          onClick={() => {
                            recentSearches.add(trimmed);
                            close();
                          }}
                          className="flex min-h-16 items-center gap-3 rounded-control py-2 hover:bg-paper"
                        >
                          <span className="size-12 shrink-0 overflow-hidden rounded-control border border-sand-line bg-image-placeholder">
                            {thumb && (
                              <img
                                src={thumb}
                                alt=""
                                width={48}
                                height={48}
                                className="size-full object-cover"
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate type-body text-ink">
                              {product.name}
                            </span>
                            {product.soldOut && (
                              <span className="type-caption text-soft-ink">
                                Sold out
                              </span>
                            )}
                          </span>
                          <Price
                            size="inline"
                            price={product.priceMin}
                            compareAt={product.compareAtPrice}
                            from={product.priceMax > product.priceMin}
                            className="shrink-0 text-right"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {data && data.categories.length > 0 && (
              <section aria-labelledby="search-categories">
                <h3 id="search-categories" className="type-label text-soft-ink">
                  Categories
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {data.categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        to={routes.category(category.slug)}
                        onClick={close}
                        className="inline-flex h-10 items-center rounded-full border border-sand-line bg-paper px-4 type-nav text-ink hover:border-rosewood hover:text-rosewood"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <button
              type="button"
              onClick={() => go(query)}
              className="inline-flex min-h-11 items-center gap-1.5 type-nav link"
            >
              See all results for &lsquo;{trimmed}&rsquo;
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function PopularCategories({
  nav,
  onPick,
}: {
  nav: ReturnType<typeof useStorefrontNav>;
  onPick: () => void;
}) {
  return (
    <section aria-labelledby="popular-categories">
      <h3 id="popular-categories" className="type-label text-soft-ink">
        Popular categories
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
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
            <Link
              to={item.to}
              onClick={onPick}
              className="inline-flex h-10 items-center rounded-full border border-sand-line bg-paper px-4 type-nav text-ink hover:border-rosewood hover:text-rosewood"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SearchDialog;
