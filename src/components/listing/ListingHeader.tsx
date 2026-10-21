import type { ReactNode } from "react";
import Breadcrumbs, { type Crumb } from "../ui/Breadcrumbs";
import { ChipLink } from "../ui/Chip";
import { Skeleton } from "../ui/Skeleton";
import { imageUrl } from "../../lib/images";

/**
 * Top of a listing: breadcrumbs, the banner (4:1 on desktop, 2:1 on phones,
 * only when there's a photo), the title, a short intro and sub-category
 * chips that lead to their own pages.
 */
function ListingHeader({
  crumbs,
  title,
  intro,
  bannerDesktop,
  bannerMobile,
  bannerAlt = "",
  chips,
  chipsLabel = "Categories",
  loading,
  children,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  intro?: string;
  bannerDesktop?: string | null;
  bannerMobile?: string | null;
  bannerAlt?: string;
  chips?: { to: string; label: string }[];
  chipsLabel?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  const desktop = imageUrl(bannerDesktop, "site-media");
  const mobile = imageUrl(bannerMobile, "site-media") ?? desktop;

  return (
    <header className="pt-4 md:pt-6">
      <Breadcrumbs items={crumbs} />
      {(mobile || desktop) && (
        <div className="mt-4 overflow-hidden rounded-card border border-sand-line/70 bg-image-placeholder md:mt-5">
          <picture>
            {desktop && (
              <source
                media="(min-width: 768px)"
                srcSet={desktop}
                width={1776}
                height={444}
              />
            )}
            <img
              src={(mobile ?? desktop)!}
              alt={bannerAlt}
              width={1440}
              height={720}
              fetchPriority="high"
              decoding="async"
              className="block aspect-[2/1] w-full object-cover md:aspect-[4/1]"
            />
          </picture>
        </div>
      )}
      <div className="mt-6 max-w-3xl md:mt-8">
        {loading ? (
          <>
            <Skeleton className="h-9 w-56 md:h-11" />
            <Skeleton className="mt-4 h-4 w-full max-w-md" />
          </>
        ) : (
          <>
            <h1 className="type-h1 text-ink">{title}</h1>
            {intro && (
              <p className="mt-3 type-body-lg text-soft-ink">{intro}</p>
            )}
          </>
        )}
      </div>
      {children}
      {chips && chips.length > 1 && (
        <nav aria-label={chipsLabel} className="mt-5">
          <ul className="dc-scroller -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-1 md:flex-wrap md:overflow-visible">
            {chips.map((chip) => (
              <li key={chip.to}>
                <ChipLink to={chip.to}>{chip.label}</ChipLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export default ListingHeader;
