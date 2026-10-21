import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { Button } from "../ui/Button";
import { controlClasses } from "../ui/fieldStyles";
import { recentSearches } from "../../features/search/recentSearches";
import { routes } from "../../lib/routes";

/** The search box on the results page, to change the search in place. */
function SearchForm({ query }: { query: string }) {
  const navigate = useNavigate();
  // The page re-mounts this form when the search changes (key = query).
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    recentSearches.add(q);
    navigate(routes.search(q));
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="mt-5 flex max-w-xl items-end gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor="results-search" className="sr-only">
          Search the shop
        </label>
        <Search
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft-ink"
        />
        <input
          id="results-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search lamps, desk picks, gifts"
          className={controlClasses({
            className:
              "h-12 pr-3 pl-10 placeholder:text-[15px] [&::-webkit-search-cancel-button]:hidden",
          })}
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}

export default SearchForm;
