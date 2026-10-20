import Logo from "../components/brand/Logo";
import { ButtonLink } from "../components/ui/Button";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import { usePageMeta } from "../hooks/usePageMeta";
import { routes } from "../lib/routes";

/** 404. Copy from brand doc section 6 ("Page not found"). */
function NotFoundPage() {
  usePageMeta({ title: "Page not found", noindex: true });

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="flex max-w-md flex-col items-center">
        <Logo variant="monogram" width={72} decorative />
        <h1 className="mt-8 type-h1">{emptyCopy.notFound.title}</h1>
        <p className="mt-3 type-body-lg text-soft-ink">
          {emptyCopy.notFound.body}
        </p>
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
