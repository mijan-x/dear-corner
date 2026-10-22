import Logo from "../components/brand/Logo";
import SearchForm from "../components/listing/SearchForm";
import { ButtonLink } from "../components/ui/Button";
import { ChipLink } from "../components/ui/Chip";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import { usePageMeta } from "../hooks/usePageMeta";
import { routes } from "../lib/routes";
import { useStorefrontNav } from "../services/catalog";

/**
 * 404. Copy from brand doc section 6 ("Page not found"), plus a search box
 * and the shop's categories so a dead end still leads somewhere.
 */
function NotFoundPage() {
  usePageMeta({ title: "Page not found", noindex: true });
  const nav = useStorefrontNav();

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="flex w-full max-w-xl flex-col items-center">
        <Logo variant="monogram" width={72} decorative />
        <h1 className="mt-8 type-h1">{emptyCopy.notFound.title}</h1>
        <p className="mt-3 type-body-lg text-soft-ink">
          {emptyCopy.notFound.body}
        </p>
        <div className="w-full text-left [&_form]:mx-auto">
          <SearchForm query="" />
        </div>
        {nav.categories.length > 0 && (
          <nav aria-label="Shop categories" className="mt-8">
            <h2 className="type-label text-soft-ink">Or browse a corner</h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {nav.categories.map((c) => (
                <li key={c.slug}>
                  <ChipLink to={routes.category(c.slug)}>{c.name}</ChipLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to={routes.home}>Back to the shop</ButtonLink>
          <ButtonLink to={routes.trackOrder} variant="secondary">
            Track an order
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
