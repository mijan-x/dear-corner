import { isRouteErrorResponse, Link, useRouteError } from "react-router";

/** Shown when a route fails to load or render. */
function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "";
  // After a new deploy, an old tab may ask for a page file that no longer exists.
  const staleBuild =
    /dynamically imported module|Importing a module script failed/i.test(
      message,
    );
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main
      id="main"
      className="grid min-h-[70vh] place-items-center bg-linen px-4 py-16 text-center text-ink"
    >
      <div className="max-w-md">
        <h1 className="type-h1">
          {notFound
            ? "This corner is empty."
            : staleBuild
              ? "We've just updated the shop."
              : "Something went wrong on our side."}
        </h1>
        <p className="mt-3 type-body text-soft-ink">
          {notFound
            ? "Let's get you back to the shop."
            : staleBuild
              ? "Reload the page to see the latest version."
              : "Reload the page to try again. If it keeps happening, tell us and we'll fix it."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center rounded-control bg-rosewood px-6 type-button text-white hover:bg-rosewood-hover active:bg-rosewood-pressed"
          >
            Reload page
          </button>
          <Link
            to="/"
            className="inline-flex h-12 items-center rounded-control border-[1.5px] border-rosewood bg-paper px-6 type-button text-rosewood hover:bg-clay-blush"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default RouteError;
